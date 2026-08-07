package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"naevis/config"
	"naevis/infra"
	log "naevis/utils/logger"
)

// Authenticate returns a standard middleware for HTTP handlers
func Authenticate(app *infra.Deps) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if websocket.IsWebSocketUpgrade(r) {
				next(w, r)
				return
			}

			tokenString := ExtractBearerToken(r.Header.Get("Authorization"))
			if tokenString == "" {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := ParseToken(tokenString)
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// hard fail if expired
			if time.Now().After(claims.ExpiresAt.Time) {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), config.UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, config.RoleKey, claims.Role)

			next(w, r.WithContext(ctx))
		}
	}
}

/*
============================================================
OptionalAuth Middleware
============================================================
*/

func OptionalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenString := ExtractBearerToken(r.Header.Get("Authorization"))
		if tokenString != "" {
			if claims, err := ParseToken(tokenString); err == nil {
				ctx := context.WithValue(r.Context(), config.UserIDKey, claims.UserID)
				ctx = context.WithValue(ctx, config.RoleKey, claims.Role)
				r = r.WithContext(ctx)
			}
		}
		next(w, r)
	}
}

/*
============================================================
RequireRoles Middleware
============================================================
*/

func RequireRoles(allowedRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
	for i, role := range allowedRoles {
		allowedRoles[i] = strings.ToLower(role)
	}

	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			raw := r.Context().Value(config.RoleKey)

			log.Printf("RoleKey value: %#v", raw)

			roles, ok := raw.([]string)
			if !ok || len(roles) == 0 {
				log.Printf("roles assertion failed: %#v", raw)
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			log.Printf("user roles: %v", roles)
			log.Printf("allowed roles: %v", allowedRoles)

			for _, role := range roles {
				role = strings.ToLower(role)

				for _, allowed := range allowedRoles {
					if role == allowed {
						log.Printf("role match: %s", role)
						next(w, r)
						return
					}
				}
			}

			log.Printf("no matching role found")
			http.Error(w, "Forbidden", http.StatusForbidden)
		}
	}
}
