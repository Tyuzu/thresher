package auth

import (
	"context"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	"net/http"
	"time"

	"naevis/auth/repo"
	aus "naevis/auth/usecase"
)

/* ============================================================
   REFRESH TOKEN (STRICT, COOKIE LIFECYCLE HANDLED IN HANDLER)
============================================================ */

// RefreshToken handler: reads cookie, delegates logic, and applies cookie changes exactly once.
func RefreshToken(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := aus.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		cookie, err := r.Cookie("refresh_token")
		if err != nil || cookie.Value == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Missing refresh token")
			return
		}

		accessToken, newRefresh, clearCookie, err := uc.RefreshTokenFromCookie(ctx, cookie.Value, r)
		if err != nil {
			if clearCookie {
				clearRefreshCookie(w)
			}
			utils.RespondWithError(w, http.StatusUnauthorized, err.Error())
			return
		}

		// Apply cookie changes (single place)
		if newRefresh != "" {
			setRefreshCookie(w, newRefresh)
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.TokenRefreshed, mqevent.TokenRefreshPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"message": "Token refreshed successfully", "data": map[string]string{"token": accessToken}})
	}
}

// (logic moved into usecase)
