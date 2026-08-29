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

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/middleware"
	"scav/utils"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

/* ============================================================
   1. HANDLERS (HTTP LAYER)
============================================================ */

func Login(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var creds LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}
		creds.Username = strings.TrimSpace(creds.Username)

		ip := clientIP(r)
		failKey := fmt.Sprintf("auth:fail:%s:%s", creds.Username, ipPrefix(ip))
		uaHashStr := uaHash(r)
		ipPrefixStr := ipPrefix(ip)

		if isLocked := CheckRateLimitLockout(ctx, app, failKey); isLocked {
			utils.RespondWithError(w, http.StatusTooManyRequests, "Too many attempts")
			return
		}

		accessToken, refreshToken, userID, err := AuthenticateAndCreateSession(ctx, app, creds, uaHashStr, ipPrefixStr)
		if err != nil {
			IncrementRateLimitCounter(ctx, app, failKey)

			if errors.Is(err, ErrAuthInvalidCredentials) {
				utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}

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
   2. SERVICES (BUSINESS LAYER)
============================================================ */

func AuthenticateAndCreateSession(ctx context.Context, app *infra.Deps, creds LoginRequest, uaHash string, ipPrefix string) (string, string, string, error) {
	user, err := GetUserByUsername(ctx, app, creds.Username)
	if err != nil {
		return "", "", "", ErrAuthInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password)); err != nil {
		return "", "", "", ErrAuthInvalidCredentials
	}

	claims := &middleware.Claims{
		UserID:   user.UserID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	accessToken, err := createAccessToken(claims)
	if err != nil {
		return "", "", "", ErrTokenGeneration
	}

	refreshToken, err := generateRefreshToken()
	if err != nil {
		return "", "", "", ErrTokenGeneration
	}

	_, err = PersistUserSession(
		ctx,
		app,
		user.UserID,
		hashRefreshToken(refreshToken),
		uaHash,
		ipPrefix,
	)
	if err != nil {
		return "", "", "", ErrSessionPersistence
	}

	return accessToken, refreshToken, user.UserID, nil
}

/* ============================================================
   3. REPOSITORIES (DATA ACCESS / CACHE LAYER)
============================================================ */

func CheckRateLimitLockout(ctx context.Context, app *infra.Deps, failKey string) bool {
	val, err := app.Cache.Get(ctx, failKey)
	var cnt int64
	if err == nil && len(val) > 0 {
		cnt, _ = strconv.ParseInt(string(val), 10, 64)
	}
	return cnt >= maxFailedAttempts
}

func IncrementRateLimitCounter(ctx context.Context, app *infra.Deps, failKey string) {
	cnt, err := app.Cache.Incr(ctx, failKey)
	if err != nil {
		cnt = 0
	}
	_ = app.Cache.Set(ctx, failKey, []byte(strconv.FormatInt(cnt, 10)), lockoutDuration)
}

func ClearRateLimitCounter(ctx context.Context, app *infra.Deps, failKey string) error {
	return app.Cache.Del(ctx, failKey)
}

func GetUserByUsername(ctx context.Context, app *infra.Deps, username string) (User, error) {
	return FindUserByUsername(ctx, app, username)
}

func PersistUserSession(ctx context.Context, app *infra.Deps, userID, hashedRefreshToken, uaHash, ipPrefix string) (any, error) {
	return UpdateUserSession(ctx, app, userID, hashedRefreshToken, uaHash, ipPrefix)
}
