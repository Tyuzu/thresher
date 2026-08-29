package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"scav/config"
	"scav/infra"
	log "scav/utils/logger"
)

// Helper to write standardized JSON error responses
func writeJSONError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// ExtractToken tries Bearer Header -> Cookie -> Query Param
func ExtractToken(r *http.Request) string {
	// 1. Authorization Header
	if token := ExtractBearerToken(r.Header.Get("Authorization")); token != "" {
		return token
	}

	// 2. Cookie Fallback
	if cookie, err := r.Cookie("token"); err == nil && cookie.Value != "" {
		return cookie.Value
	}

	// 3. Query Param (common for WebSockets or sendBeacon)
	if token := r.URL.Query().Get("token"); token != "" {
		return token
	}

	return ""
}

// Authenticate returns a standard middleware for HTTP handlers
func Authenticate(app *infra.Deps) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tokenString := ExtractToken(r)

			if tokenString == "" {
				if websocket.IsWebSocketUpgrade(r) {
					http.Error(w, "Unauthorized WebSocket", http.StatusUnauthorized)
					return
				}
				writeJSONError(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := ParseToken(tokenString)
			if err != nil || (claims.ExpiresAt != nil && time.Now().After(claims.ExpiresAt.Time)) {
				writeJSONError(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), config.UserIDKey, claims.UserID)
			// Assign claims.Role ([]string) directly to config.RoleKey
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
		tokenString := ExtractToken(r)
		if tokenString != "" {
			if claims, err := ParseToken(tokenString); err == nil {
				if claims.ExpiresAt == nil || time.Now().Before(claims.ExpiresAt.Time) {
					ctx := context.WithValue(r.Context(), config.UserIDKey, claims.UserID)
					// Assign claims.Role ([]string) directly to config.RoleKey
					ctx = context.WithValue(ctx, config.RoleKey, claims.Role)

					r = r.WithContext(ctx)
				}
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
	normalizedAllowed := make([]string, len(allowedRoles))
	for i, role := range allowedRoles {
		normalizedAllowed[i] = strings.ToLower(role)
	}

	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			raw := r.Context().Value(config.RoleKey)

			roles, ok := raw.([]string)
			if !ok || len(roles) == 0 {
				log.Printf("[RequireRoles] Role type assertion failed for raw value: %#v", raw)
				writeJSONError(w, "Forbidden", http.StatusForbidden)
				return
			}

			for _, userRole := range roles {
				userRoleLower := strings.ToLower(userRole)
				for _, allowed := range normalizedAllowed {
					if userRoleLower == allowed {
						next(w, r)
						return
					}
				}
			}

			log.Printf("[RequireRoles] User roles %v do not match allowed %v", roles, normalizedAllowed)
			writeJSONError(w, "Forbidden", http.StatusForbidden)
		}
	}
}
