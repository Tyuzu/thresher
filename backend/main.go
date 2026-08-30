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
	if err := logger.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to init logger: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = logger.Sync() }()

	cfg, err := config.InitConfig()
	if err != nil {
		logger.L.Sugar().Fatalw("config validation failed", "error", err)
	}

	app, err := infra.New(cfg)
	if err != nil {
		logger.L.Sugar().Fatalw("Failed to initialize infrastructure", "error", err)
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

	// Distributed/Redis rate limiter preferred for multi-instance scaling
	rateLimiter := middleware.NewRateLimiter(1, 12, 10*time.Minute, 10000)

	// Run both chat hubs
	hub := newchat.NewHub()
	go hub.Run()

	mehub := mechat.NewHub()
	go mehub.Run()

	router := routes.SetupRouter(app, rateLimiter)

	newchat.AddNewChatRoutes(router, hub, app, rateLimiter)
	mechat.AddMeChatRoutes(router, mehub, app, rateLimiter)
	routes.AddStaticRoutes(router)

	// Hardened readiness check using direct connectivity test
	router.GET("/ready", func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		if err := app.DB.Ping(ctx); err != nil {
			http.Error(w, "db_unavailable", http.StatusServiceUnavailable)
			return
		}

		if _, err := app.Cache.Ping(ctx); err != nil {
			http.Error(w, "cache_unavailable", http.StatusServiceUnavailable)
			return
		}

		if app.MQ != nil {
			if err := app.MQ.Ping(ctx); err != nil {
				http.Error(w, "mq_unavailable", http.StatusServiceUnavailable)
				return
			}
		}

		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Security and logging chain applied directly to router
	handler := middleware.LoggingMiddleware(
		middleware.SecurityHeaders(router),
	)

	// Explicit CORS Configuration compatible with HttpOnly Cookies and custom headers
	corsOpts := cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"HEAD", "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "Idempotency-Key", "X-Requested-With", "X-Refresh-Intent", "Accept", "Origin"},
		ExposedHeaders:   []string{"Authorization", "X-Refresh-Intent"},
		AllowCredentials: true, // Required for HttpOnly refresh_token cookies
		MaxAge:           300,
	}

	corsHandler := cors.New(corsOpts).Handler(handler)

	server := &http.Server{
		Addr:              cfg.HTTPPort,
		Handler:           corsHandler,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
		IdleTimeout:       120 * time.Second,
		// WriteTimeout is omitted for WebSocket long-lived connection compatibility
	}

	go func() {
		logger.L.Sugar().Infow("API server listening", "addr", cfg.HTTPPort)

		var err error
		if !cfg.TerminateTLSAtLB && cfg.TLSCertPath != "" && cfg.TLSKeyPath != "" {
			err = server.ListenAndServeTLS(cfg.TLSCertPath, cfg.TLSKeyPath)
		} else {
			err = server.ListenAndServe()
		}

		if err != nil && err != http.ErrServerClosed {
			logger.L.Sugar().Fatalw("Server error", "error", err)
		}
	}()

	// Graceful shutdown orchestration
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	logger.L.Sugar().Infow("Shutting down server...")

	// 1. Stop accepting new HTTP requests and wait for in-flight requests to complete
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.L.Sugar().Errorw("HTTP server shutdown error", "error", err)
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

	// 2. Stop rate limiter background routines
	rateLimiter.Stop()

	// 3. Stop internal background hubs
	hub.Stop()
	mehub.Stop()

	// 4. Drain and close transport / database resources
	if app.NatsConn != nil {
		_ = app.NatsConn.Drain()
		app.NatsConn.Close()
	}

	// if app.DB != nil {
	// 	_ = app.DB.Close()
	// }

	// if app.Cache != nil {
	// 	_ = app.Cache.Close()
	// }

	logger.L.Sugar().Infow("Server stopped successfully")
}
