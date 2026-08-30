// cmd/api/main.go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"scav/config"
	"scav/infra"
	"scav/infra/workers"
	"scav/internal/mechat"
	"scav/internal/newchat"
	"scav/middleware"
	"scav/routes"
	"scav/utils/logger"

	"github.com/julienschmidt/httprouter"
	"github.com/rs/cors"
)

func main() {
	// =====================
	// Logger
	// =====================
	if err := logger.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to init logger: %v\n", err)
		os.Exit(1)
	}

	defer func() {
		_ = logger.Sync()
	}()

	// =====================
	// Configuration
	// =====================
	cfg, err := config.InitConfig()
	if err != nil {
		logger.L.Sugar().Fatalw(
			"config validation failed",
			"error", err,
		)
	}

	// =====================
	// Infrastructure
	// =====================
	app, err := infra.New(cfg)
	if err != nil {
		logger.L.Sugar().Fatalw(
			"failed to initialize infrastructure",
			"error", err,
		)
	}

	// =====================
	// Application Lifecycle
	// =====================
	//
	// This context is shared by background workers and
	// MQ subscribers.
	//
	// When appCancel() is called during shutdown:
	//
	//     appCancel()
	//          |
	//          v
	//     ctx.Done()
	//          |
	//          v
	//     MQ subscribers stop
	//
	appCtx, appCancel := context.WithCancel(
		context.Background(),
	)
	defer appCancel()

	// =====================
	// MQ Subscribers
	// =====================
	//
	// Register all MQ consumers ONCE during application startup.
	//
	// Example:
	//
	//     chat.message.created
	//             |
	//             v
	//     handleChatMessageCreated()
	//
	// We do NOT subscribe every time an event is published.
	//
	if app.MQ != nil {
		if err := workers.RegisterAll(appCtx, app); err != nil {
			logger.L.Sugar().Fatalw(
				"failed to register MQ subscribers",
				"error", err,
			)
		}

		logger.L.Sugar().Infow(
			"MQ subscribers registered",
		)
	} else {
		logger.L.Sugar().Warnw(
			"MQ is not configured; skipping MQ subscribers",
		)
	}

	// =====================
	// Rate Limiter
	// =====================
	rateLimiter := middleware.NewRateLimiter(
		1,
		12,
		10*time.Minute,
		10000,
	)

	// =====================
	// Chat Hubs
	// =====================
	hub := newchat.NewHub()
	go hub.Run()

	mehub := mechat.NewHub()
	go mehub.Run()

	// =====================
	// Router Setup
	// =====================
	router := routes.SetupRouter(
		app,
		rateLimiter,
	)

	newchat.AddNewChatRoutes(
		router,
		hub,
		app,
		rateLimiter,
	)

	mechat.AddMeChatRoutes(
		router,
		mehub,
		app,
		rateLimiter,
	)

	routes.AddStaticRoutes(router)

	// =====================
	// Readiness Probe
	// =====================
	router.GET(
		"/ready",
		func(
			w http.ResponseWriter,
			r *http.Request,
			_ httprouter.Params,
		) {
			ctx, cancel := context.WithTimeout(
				r.Context(),
				2*time.Second,
			)
			defer cancel()

			// Database
			if err := app.DB.Ping(ctx); err != nil {
				http.Error(
					w,
					"db_unavailable",
					http.StatusServiceUnavailable,
				)
				return
			}

			// Cache
			if _, err := app.Cache.Ping(ctx); err != nil {
				http.Error(
					w,
					"cache_unavailable",
					http.StatusServiceUnavailable,
				)
				return
			}

			// Message Queue
			if app.MQ != nil {
				if err := app.MQ.Ping(ctx); err != nil {
					http.Error(
						w,
						"mq_unavailable",
						http.StatusServiceUnavailable,
					)
					return
				}
			}

			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok"))
		},
	)

	// =====================
	// Middleware & CORS
	// =====================
	handler := middleware.LoggingMiddleware(
		middleware.SecurityHeaders(router),
	)

	corsOpts := cors.Options{
		AllowedOrigins: cfg.AllowedOrigins,

		AllowedMethods: []string{
			"HEAD",
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		},

		AllowedHeaders: []string{
			"Content-Type",
			"Authorization",
			"Idempotency-Key",
			"X-Requested-With",
			"Accept",
			"Origin",
		},

		AllowCredentials: cfg.AllowCredentials,

		MaxAge: 300,
	}

	corsHandler := cors.New(corsOpts).Handler(handler)

	// =====================
	// HTTP Server
	// =====================
	server := &http.Server{
		Addr:    cfg.HTTPPort,
		Handler: corsHandler,

		ReadTimeout:       7 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// =====================
	// Start HTTP Server
	// =====================
	go func() {
		logger.L.Sugar().Infow(
			"API server listening",
			"addr", cfg.HTTPPort,
			"protocol", "http",
		)

		err := server.ListenAndServe()

		if err != nil && err != http.ErrServerClosed {
			logger.L.Sugar().Fatalw(
				"HTTP server error",
				"error", err,
			)
		}
	}()

	// =====================
	// Wait for Shutdown Signal
	// =====================
	sigCh := make(chan os.Signal, 1)

	signal.Notify(
		sigCh,
		os.Interrupt,
		syscall.SIGTERM,
	)

	<-sigCh

	logger.L.Sugar().Infow(
		"Shutting down server...",
	)

	// =====================
	// Graceful Shutdown
	// =====================

	// Give HTTP handlers time to finish.
	//
	// This is important because an HTTP handler might currently
	// be publishing an event to NATS.
	shutdownCtx, shutdownCancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.L.Sugar().Errorw(
			"HTTP server shutdown error",
			"error", err,
		)
	}

	// =====================
	// Stop MQ Subscribers
	// =====================
	//
	// This cancels appCtx.
	//
	// Your MQ subscription code should be doing:
	//
	//     go func() {
	//         <-ctx.Done()
	//         sub.Drain()
	//     }()
	//
	// Therefore all subscribers begin shutting down here.
	logger.L.Sugar().Infow(
		"Stopping MQ subscribers...",
	)

	appCancel()

	// =====================
	// Stop Application Workers
	// =====================
	logger.L.Sugar().Infow(
		"Stopping application workers...",
	)

	rateLimiter.Stop()
	hub.Stop()
	mehub.Stop()

	// =====================
	// Drain NATS
	// =====================
	//
	// Subscribers have already received the cancellation signal.
	//
	// Now drain the underlying NATS connection.
	logger.L.Sugar().Infow(
		"Draining NATS connection...",
	)

	if app.NatsConn != nil {
		if err := app.NatsConn.Drain(); err != nil {
			logger.L.Sugar().Errorw(
				"NATS drain error",
				"error", err,
			)
		}

		app.NatsConn.Close()
	}

	logger.L.Sugar().Infow(
		"Server stopped successfully",
	)
}
