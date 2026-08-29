package auth

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/middleware"
	"scav/utils"

	"github.com/golang-jwt/jwt/v5"
)

func RefreshToken(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Enforce CSRF protection on refresh endpoint
		if r.Header.Get("X-Refresh-Intent") != "1" {
			utils.RespondWithError(w, http.StatusForbidden, "CSRF blocked")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		cookie, err := r.Cookie("refresh_token")
		if err != nil || cookie.Value == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Missing refresh token")
			return
		}

		result, err := RefreshTokenFromCookie(ctx, cookie.Value, r, app)
		if err != nil {
			if result != nil && result.ClearCookie {
				clearRefreshCookie(w)
			}
			utils.RespondWithError(w, http.StatusUnauthorized, err.Error())
			return
		}

		if result.NewRefresh != "" {
			setRefreshCookie(w, result.NewRefresh)
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.TokenRefreshed, mqevent.TokenRefreshedPayload{
			UserID:     result.UserID,
			UserAgent:  r.UserAgent(),
			IPAddress:  r.RemoteAddr,
			OccurredAt: time.Now().UTC(),
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Token refreshed successfully",
			"data": map[string]string{
				"token": result.AccessToken,
			},
		})
	}
}

func RefreshTokenFromCookie(ctx context.Context, rawToken string, r *http.Request, app *infra.Deps) (*RefreshResult, error) {
	now := time.Now()
	hashed := hashRefreshToken(rawToken)

	user, err := FindValidRefreshSession(ctx, app, hashed)
	if err != nil {
		return &RefreshResult{ClearCookie: true}, fmt.Errorf("invalid refresh token")
	}

	// Graceful evaluation for token reuse vs concurrent requests
	if user.RefreshPrev == hashed {
		_, _ = InvalidateUserSession(ctx, app, user.UserID)
		return &RefreshResult{ClearCookie: true}, fmt.Errorf("refresh token reuse detected")
	}

	if user.RefreshUA != uaHash(r) {
		_, _ = InvalidateUserSession(ctx, app, user.UserID)
		return &RefreshResult{ClearCookie: true}, fmt.Errorf("session invalidated")
	}

	claims := &middleware.Claims{
		UserID:   user.UserID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	accessToken, err := createAccessToken(claims)
	if err != nil {
		return nil, err
	}

	newRefresh, err := generateRefreshToken()
	if err != nil {
		return nil, err
	}

	_, err = RotateRefreshTokenForUser(
		ctx,
		app,
		user.UserID,
		hashRefreshToken(newRefresh),
		user.RefreshToken,
		uaHash(r),
	)
	if err != nil {
		return nil, err
	}

	return &RefreshResult{
		UserID:      user.UserID,
		AccessToken: accessToken,
		NewRefresh:  newRefresh,
	}, nil
}
