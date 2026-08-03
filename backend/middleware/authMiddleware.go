package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/utils"
)

// Authenticate returns a standard middleware for HTTP handlers
func Authenticate(app *infra.Deps) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tokenString := utils.ExtractBearerToken(r.Header.Get("Authorization"))
			if tokenString == "" {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := utils.ParseToken(tokenString)
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
		tokenString := utils.ExtractBearerToken(r.Header.Get("Authorization"))
		if tokenString != "" {
			if claims, err := utils.ParseToken(tokenString); err == nil {
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

			var roles []string
			switch v := raw.(type) {
			case []string:
				roles = v
			case string:
				roles = []string{v}
			default:
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			if len(roles) == 0 {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			for _, role := range roles {
				role = strings.ToLower(role)

				for _, allowed := range allowedRoles {
					if role == allowed {
						next(w, r)
						return
					}
				}
			}

			http.Error(w, "Forbidden", http.StatusForbidden)
		}
	}
}
