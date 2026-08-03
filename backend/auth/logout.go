package auth

import (
	"context"
	"net/http"
	"time"

	"naevis/auth/repo"
	aus "naevis/auth/usecase"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
)

/* ============================================================
   LOGOUT
============================================================ */

func LogoutUser(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := aus.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		// CSRF Check
		if r.Header.Get("X-Refresh-Intent") != "1" {
			utils.RespondWithError(w, http.StatusForbidden, "CSRF blocked")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		// Safely extract the refresh token from cookie
		var tokenStr string
		if cookie, err := r.Cookie("refresh_token"); err == nil {
			tokenStr = cookie.Value
		}

		// Handoff logic & event publishing down to the service layer
		if tokenStr != "" {
			_ = uc.ProcessSingleLogout(ctx, tokenStr)
		}

		clearRefreshCookie(w)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Logged out",
			"data":    nil,
		})
	}
}

// ProcessSingleLogout wraps token transformation and calls downstream side effects
func ProcessSingleLogout(ctx context.Context, app *infra.Deps, rawRefreshToken string) error {
	// kept for compatibility; delegate to usecase
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := aus.NewAuthUsecase(repoImpl, app.MQ)
	return uc.ProcessSingleLogout(ctx, rawRefreshToken)
}

// RevokeSessionAndEmit deletes a single session via token hash and publishes the broker event
func RevokeSessionAndEmit(ctx context.Context, app *infra.Deps, hashedToken string) error {
	if err := LogoutUserByRefreshToken(ctx, app, hashedToken); err != nil {
		return err
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedOut, mqevent.UserLoggedOutPayload{})
	return nil
}

/* ============================================================
   LOGOUT ALL SESSIONS
============================================================ */

func LogoutAllSessions(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := aus.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Extract and validate token
		claims, err := utils.ValidateJWT(authHeader)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		// Handoff to service layer to clear DB sessions and fire MQ events
		if err := uc.ProcessGlobalLogout(ctx, claims.UserID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Logout failed")
			return
		}

		clearRefreshCookie(w)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "All sessions revoked",
		})
	}
}

// ProcessGlobalLogout handles multi-device session revocation orchestration
func ProcessGlobalLogout(ctx context.Context, app *infra.Deps, userID string) error {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := aus.NewAuthUsecase(repoImpl, app.MQ)
	return uc.ProcessGlobalLogout(ctx, userID)
}

// RevokeAllSessionsAndEmit clears the user's sessions globally from storage and fires a system-wide event
func RevokeAllSessionsAndEmit(ctx context.Context, app *infra.Deps, userID string) error {
	if err := LogoutAllUserSessions(ctx, app, userID); err != nil {
		return err
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedOutAllSessions, mqevent.UserLoggedOutPayload{})
	return nil
}
