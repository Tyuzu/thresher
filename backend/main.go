package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/mechat"
	"naevis/middleware"
	"naevis/newchat"
	"naevis/routes"

	"naevis/utils/logger"

	"github.com/julienschmidt/httprouter"

	"github.com/rs/cors"
)

func main() {
	if err := logger.Init(); err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer func() { _ = logger.Sync() }()

	cfg, err := config.InitConfig()
	if err != nil {
		logger.L.Sugar().Fatalw("config validation failed", "error", err)
	}
	env := cfg.Env

	app, err := infra.New(cfg)
	if err != nil {
		logger.L.Sugar().Fatalw("Failed to initialize infrastructure", "error", err)
	}

	// =====================
	// Rate limiter
	// =====================
	rateLimiter := middleware.NewRateLimiter(
		1,
		12,
		10*time.Minute,
		10000,
	)

	// =====================
	// Chat hub
	// =====================
	hub := newchat.NewHub()
	go hub.Run()

	mehub := mechat.NewHub()

	// =====================
	// Router & middleware
	// =====================
	router := routes.SetupRouter(app, rateLimiter)

	// Additional routes
	routes.AddNewChatRoutes(router, hub, app, rateLimiter)
	routes.AddMeChatRoutes(router, mehub, app, rateLimiter)
	routes.AddStaticRoutes(router)

	// Register readiness probe
	router.GET("/ready", func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		// basic checks: DB ping and Redis ping via cache interface
		ctx := r.Context()
		if err := app.DB.Ping(ctx); err != nil {
			http.Error(w, "db_unavailable", http.StatusServiceUnavailable)
			return
		}

		// check redis via cache.Exists
		if ok, err := app.Cache.Exists(ctx, "__health_check__"); err != nil || !ok {
			http.Error(w, "cache_unavailable", http.StatusServiceUnavailable)
			return
		}

		// check MQ
		if app.MQ != nil {
			if err := app.MQ.Ping(ctx); err != nil {
				http.Error(w, "mq_unavailable", http.StatusServiceUnavailable)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	innerHandler := middleware.LoggingMiddleware(
		middleware.SecurityHeaders(router),
	)

	// Hardened CORS settings
	corsOpts := cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"HEAD", "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "Idempotency-Key", "X-Requested-With", "Accept", "Origin"},
		AllowCredentials: cfg.AllowCredentials,
		MaxAge:           300,
	}

	corsHandler := cors.New(corsOpts).Handler(innerHandler)

	mux := http.NewServeMux()
	mux.Handle("/", corsHandler)

	// =====================
	// HTTP server
	// =====================
	server := &http.Server{
		Addr:              cfg.HTTPPort,
		Handler:           mux,
		ReadTimeout:       7 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       120 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
	}

	go func() {
		logger.L.Sugar().Infow("API server listening", "addr", cfg.HTTPPort)

		var err error

		if env == "production" {
			// Require TLS certs to be configured in production (validated earlier)
			err = server.ListenAndServeTLS(cfg.TLSCertPath, cfg.TLSKeyPath)
		} else {
			// allow optional TLS in non-production if paths provided
			if cfg.TLSCertPath != "" && cfg.TLSKeyPath != "" {
				err = server.ListenAndServeTLS(cfg.TLSCertPath, cfg.TLSKeyPath)
			} else {
				err = server.ListenAndServe()
			}
		}

		if err != nil && err != http.ErrServerClosed {
			logger.L.Sugar().Fatalw("Server error", "error", err)
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

	// Stop hubs
	hub.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.L.Sugar().Fatalw("Graceful shutdown failed", "error", err)
	}

	// drain and close NATS connection if present
	if app.NatsConn != nil {
		_ = app.NatsConn.Drain()
		app.NatsConn.Close()
	}

	logger.L.Sugar().Infow("Server stopped successfully")
}
