package auth

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"

	"naevis/auth/delivery"
	"naevis/infra"
	"naevis/models"
)

// Named domain errors for exact error type assertions at the HTTP Layer
var (
	ErrAuthInvalidCredentials = errors.New("invalid credentials")
	ErrTokenGeneration        = errors.New("token error")
	ErrSessionPersistence     = errors.New("session error")
)

/* ============================================================
   1. HANDLERS (HTTP LAYER)
============================================================ */

func Login(app *infra.Deps) http.HandlerFunc {
	return delivery.NewLoginHandler(app)
}

/* ============================================================
   2/3. REPOSITORIES & HELPERS (DATA ACCESS / CACHE LAYER)
============================================================ */

func CheckRateLimitLockout(ctx context.Context, app *infra.Deps, failKey string) bool {
	val, err := app.Cache.Get(ctx, failKey)
	var cnt int64
	if err == nil && len(val) > 0 {
		cnt, err = strconv.ParseInt(string(val), 10, 64)
		if err != nil {
			log.Printf("warn: failed to parse auth fail count: %v", err)
			cnt = 0
		}
	}
	return cnt >= maxFailedAttempts
}

func IncrementRateLimitCounter(ctx context.Context, app *infra.Deps, failKey string) {
	cnt, err := app.Cache.Incr(ctx, failKey)
	if err != nil {
		log.Printf("warn: failed to increment auth fail count: %v", err)
		cnt = 0
	}

	if err = app.Cache.Set(ctx, failKey, []byte(strconv.FormatInt(cnt, 10)), lockoutDuration); err != nil {
		log.Printf("warn: failed to persist auth fail count: %v", err)
	}
}

func ClearRateLimitCounter(ctx context.Context, app *infra.Deps, failKey string) error {
	if err := app.Cache.Del(ctx, failKey); err != nil {
		log.Printf("warn: failed to clear auth fail count: %v", err)
		return err
	}
	return nil
}

func GetUserByUsername(ctx context.Context, app *infra.Deps, username string) (models.User, error) {
	return FindUserByUsername(ctx, app, username)
}
