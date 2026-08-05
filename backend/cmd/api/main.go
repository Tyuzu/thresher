package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/internal/mechat"
	"naevis/internal/newchat"
	"naevis/middleware"
	"naevis/routes"
	"naevis/utils/logger"

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
		logger.L.Sugar().Fatalw("config validation failed", "error", err)
	}

	// =====================
	// Infrastructure
	// =====================

	app, err := infra.New(cfg)
	if err != nil {
		logger.L.Sugar().Fatalw("failed to initialize infrastructure", "error", err)
	}

	// =====================
	// Rate limiter
	// =====================

	rateLimiter := middleware.NewRateLimiter(1, 12, 10*time.Minute, 10000)

	// =====================
	// Chat hub
	// =====================

	hub := newchat.NewHub()
	go hub.Run()

	mehub := mechat.NewHub()

	// =====================
	// Router
	// =====================

	router := routes.SetupRouter(app, rateLimiter)

	// =====================
	// Additional routes
	// =====================

	routes.AddNewChatRoutes(router, hub, app, rateLimiter)
	routes.AddMeChatRoutes(router, mehub, app, rateLimiter)
	routes.AddStaticRoutes(router)

	// =====================
	// Readiness probe
	// =====================

	router.GET("/ready", func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		// Database
		if err := app.DB.Ping(ctx); err != nil {
			http.Error(w, "db_unavailable", http.StatusServiceUnavailable)
			return
		}

		// Cache / Redis
		if ok, err := app.Cache.Exists(
			ctx,
			"__health_check__",
		); err != nil || !ok {
			http.Error(w, "cache_unavailable", http.StatusServiceUnavailable)
			return
		}

		// Message queue
		if app.MQ != nil {
			if err := app.MQ.Ping(ctx); err != nil {
				http.Error(w, "mq_unavailable", http.StatusServiceUnavailable)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	},
	)

	// =====================
	// Middleware
	// =====================

	innerHandler := middleware.LoggingMiddleware(
		middleware.SecurityHeaders(router),
	)

	// =====================
	// CORS
	// =====================

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
		MaxAge:           300,
	}

	corsHandler := cors.New(corsOpts).Handler(innerHandler)

	// =====================
	// HTTP multiplexer
	// =====================

	mux := http.NewServeMux()

	mux.Handle("/", corsHandler)

	// =====================
	// HTTP SERVER
	// =====================
	//
	// This server uses HTTP ONLY.
	//
	// No TLS.
	// No certificates.
	// No ListenAndServeTLS().
	//
	// cfg.HTTPPort should be:
	//
	// :80
	//
	// =====================

	server := &http.Server{
		Addr:              cfg.HTTPPort,
		Handler:           mux,
		ReadTimeout:       7 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       120 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
	}

	// =====================
	// Start HTTP server
	// =====================

	go func() {
		logger.L.Sugar().Infow("API server listening", "addr", cfg.HTTPPort, "protocol", "http")

		err := server.ListenAndServe()

		if err != nil && err != http.ErrServerClosed {
			logger.L.Sugar().Fatalw("HTTP server error", "error", err)
		}
	}()

	// =====================
	// Graceful shutdown
	// =====================

	sigCh := make(chan os.Signal, 1)

	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh

	logger.L.Sugar().Infow("Shutting down server")

	// Stop rate limiter
	rateLimiter.Stop()

	// Stop chat hub
	hub.Stop()

	// Shutdown HTTP server
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.L.Sugar().Fatalw("Graceful shutdown failed", "error", err)
	}

	// Drain and close NATS
	if app.NatsConn != nil {
		_ = app.NatsConn.Drain()
		app.NatsConn.Close()
	}

	logger.L.Sugar().Infow("Server stopped successfully")
}
