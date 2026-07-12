package middleware

import (
	"context"
	log "naevis/utils/logger"
	"net/http"
	"strings"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/utils"

	"github.com/gorilla/websocket"
	"github.com/julienschmidt/httprouter"
)

func Authenticate(app *infra.Deps) func(httprouter.Handle) httprouter.Handle {
	return func(next httprouter.Handle) httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			if websocket.IsWebSocketUpgrade(r) {
				next(w, r, ps)
				return
			}

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

			next(w, r.WithContext(ctx), ps)
		}
	}
}

/*
============================================================
OptionalAuth Middleware
============================================================
*/

func OptionalAuth(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		tokenString := utils.ExtractBearerToken(r.Header.Get("Authorization"))
		if tokenString != "" {
			if claims, err := utils.ParseToken(tokenString); err == nil {
				ctx := context.WithValue(r.Context(), config.UserIDKey, claims.UserID)
				ctx = context.WithValue(ctx, config.RoleKey, claims.Role)
				r = r.WithContext(ctx)
			}
		}
		next(w, r, ps)
	}
}

/*
============================================================
RequireRoles Middleware
============================================================
*/

func RequireRoles(allowedRoles ...string) func(httprouter.Handle) httprouter.Handle {
	for i, role := range allowedRoles {
		allowedRoles[i] = strings.ToLower(role)
	}

	return func(next httprouter.Handle) httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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
						next(w, r, ps)
						return
					}
				}
			}

			log.Printf("no matching role found")
			http.Error(w, "Forbidden", http.StatusForbidden)
		}
	}
}

// func AuthenticateWS(next func(*websocket.Conn, *http.Request)) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		token := r.URL.Query().Get("token")
// 		if token == "" {
// 			http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 			return
// 		}

// 		claims, err := utils.ParseToken(token)
// 		if err != nil || time.Now().After(claims.ExpiresAt.Time) {
// 			http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 			return
// 		}

// 		ctx := context.WithValue(r.Context(), config.UserIDKey, claims.UserID)
// 		ctx = context.WithValue(ctx, config.RoleKey, claims.Role)

// 		r = r.WithContext(ctx)

// 		conn, err := upgrader.Upgrade(w, r, nil)
// 		if err != nil {
// 			return
// 		}

// 		next(conn, r)
// 	}
// }
