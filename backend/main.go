// main.go
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

	// Distributed/Redis rate limiter preferred for multi-instance scaling
	rateLimiter := middleware.NewRateLimiter(1, 12, 10*time.Minute, 10000)

	// Run both chat hubs
	hub := newchat.NewHub()
	go hub.Run()

	mehub := mechat.NewHub()
	go mehub.Run() // Fixed: Previously unstarted goroutine

	router := routes.SetupRouter(app, rateLimiter)

	routes.AddNewChatRoutes(router, hub, app, rateLimiter)
	routes.AddMeChatRoutes(router, mehub, app, rateLimiter)
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

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Security and logging chain applied directly to router
	handler := middleware.LoggingMiddleware(
		middleware.SecurityHeaders(router),
	)

	corsOpts := cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"HEAD", "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "Idempotency-Key", "X-Requested-With", "Accept", "Origin"},
		AllowCredentials: cfg.AllowCredentials,
		MaxAge:           300,
	}

	// Eliminates redundant http.ServeMux routing
	corsHandler := cors.New(corsOpts).Handler(handler)

	server := &http.Server{
		Addr:              cfg.HTTPPort,
		Handler:           corsHandler,
		ReadTimeout:       7 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
		IdleTimeout:       120 * time.Second,
		// Omitted WriteTimeout at server level for WebSocket streaming compatibility;
		// context deadlines should be enforced inside HTTP handlers instead.
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

	// 1. Stop accepting new HTTP requests and wait for current ones to drain
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.L.Sugar().Errorw("HTTP server shutdown error", "error", err)
	}

	// 2. Stop rate limiter background routines
	rateLimiter.Stop()

	// 3. Stop internal background hubs
	hub.Stop()
	mehub.Stop()

	// 4. Drain external transport / messaging connections safely after HTTP handlers finish
	if app.NatsConn != nil {
		_ = app.NatsConn.Drain()
		app.NatsConn.Close()
	}

	logger.L.Sugar().Infow("Server stopped successfully")
}
