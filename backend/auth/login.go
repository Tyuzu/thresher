package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/auth/repo"
	aus "naevis/auth/usecase"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"
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
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := aus.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var creds LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}
		creds.Username = strings.TrimSpace(creds.Username)

		// Gather request-scoped raw layout parameters
		ip := clientIP(r)
		failKey := fmt.Sprintf("auth:fail:%s:%s", creds.Username, ipPrefix(ip))
		uaHashStr := uaHash(r)
		ipPrefixStr := ipPrefix(ip)

		// 1. Check Rate Limit
		if isLocked := CheckRateLimitLockout(ctx, app, failKey); isLocked {
			utils.RespondWithError(w, http.StatusTooManyRequests, "Too many attempts")
			return
		}

		// 2. Run Authentication and Session Creation via Service Layer orchestrators
		accessToken, refreshToken, userID, err := uc.AuthenticateAndCreateSession(ctx, creds.Username, creds.Password, uaHashStr, ipPrefixStr)
		if err != nil {
			// Track failure and update brute-force count checks
			IncrementRateLimitCounter(ctx, app, failKey)

			if errors.Is(err, ErrAuthInvalidCredentials) {
				utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// 3. Clean up security keys and finalize responses
		_ = ClearRateLimitCounter(ctx, app, failKey)

		setRefreshCookie(w, refreshToken)
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedIn, mqevent.UserLoggedInPayload{})

		utils.RespondWithJSON(w, http.StatusOK, LoginResponse{
			Message: "Login successful",
			Status:  http.StatusOK,
			Token:   accessToken,
			UserID:  userID,
		})
	}
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
