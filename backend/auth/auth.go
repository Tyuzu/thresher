package auth

import (
	"context"
	"encoding/json"
	"fmt"
	log "naevis/utils/logger"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	inmq "naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

/* ============================================================
   REGISTER
============================================================ */

func Register(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Email    string `json:"email"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		input.Username = strings.TrimSpace(input.Username)
		input.Password = strings.TrimSpace(input.Password)
		input.Email = strings.ToLower(strings.TrimSpace(input.Email))

		if !validateUsername(input.Username) ||
			!validateEmail(input.Email) ||
			!validatePassword(input.Password) {

			utils.RespondWithError(w, http.StatusBadRequest, "Invalid credentials")
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword(
			[]byte(input.Password),
			bcrypt.DefaultCost,
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Password error")
			return
		}

		now := time.Now()

		user := models.User{
			UserID:        "u" + utils.GenerateRandomString(10),
			Username:      input.Username,
			Email:         input.Email,
			Password:      string(hashedPassword),
			Role:          []string{"user"},
			CreatedAt:     now,
			UpdatedAt:     now,
			EmailVerified: false,
			IsVerified:    false,
			Online:        false,
		}

		if err := CreateUser(ctx, app.DB, user); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				utils.RespondWithError(w, http.StatusConflict, "User already exists")
				return
			}

			utils.RespondWithError(w, http.StatusInternalServerError, "Registration failed")
			return
		}

		/* ---------------- Event Payload ---------------- */
		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.UserRegistered, mqevent.UserRegisteredPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"message": "User registered successfully",
			"userid":  user.UserID,
		})
	}
}

/* ============================================================
   LOGIN
============================================================ */

func Login(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var creds struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}

		if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		creds.Username = strings.TrimSpace(creds.Username)
		// creds.Password = strings.TrimSpace(creds.Password)

		ip := clientIP(r)
		failKey := fmt.Sprintf("auth:fail:%s:%s", creds.Username, ipPrefix(ip))

		val, err := app.Cache.Get(ctx, failKey)

		var cnt int64

		if err == nil && len(val) > 0 {
			cnt, err = strconv.ParseInt(string(val), 10, 64)
			if err != nil {
				log.Printf("warn: failed to parse auth fail count: %v", err)
				cnt = 0
			}
		}

		if cnt >= maxFailedAttempts {
			utils.RespondWithError(w, http.StatusTooManyRequests, "Too many attempts")
			return
		}

		user, err := FindUserByUsername(ctx, app.DB, creds.Username)
		if err != nil {
			cnt, err = app.Cache.Incr(ctx, failKey)
			if err != nil {
				log.Printf("warn: failed to increment auth fail count: %v", err)
				cnt = 0
			}

			if err = app.Cache.Set(
				ctx,
				failKey,
				[]byte(strconv.FormatInt(cnt, 10)),
				lockoutDuration,
			); err != nil {
				log.Printf("warn: failed to persist auth fail count: %v", err)
			}

			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		if bcrypt.CompareHashAndPassword(
			[]byte(user.Password),
			[]byte(creds.Password),
		) != nil {

			cnt, err = app.Cache.Incr(ctx, failKey)
			if err != nil {
				log.Printf("warn: failed to increment auth fail count: %v", err)
				cnt = 0
			}

			if err = app.Cache.Set(
				ctx,
				failKey,
				[]byte(strconv.FormatInt(cnt, 10)),
				lockoutDuration,
			); err != nil {
				log.Printf("warn: failed to persist auth fail count: %v", err)
			}

			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		/* ---------------- Clear Fail Counter ---------------- */

		if err := app.Cache.Del(ctx, failKey); err != nil {
			log.Printf("warn: failed to clear auth fail count: %v", err)
		}

		/* ---------------- JWT Claims ---------------- */

		claims := &models.Claims{
			UserID:   user.UserID,
			Username: user.Username,
			Role:     user.Role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(
					time.Now().Add(AccessTokenTTL),
				),
				IssuedAt: jwt.NewNumericDate(time.Now()),
			},
		}

		accessToken, err := createAccessToken(claims)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Token error")
			return
		}

		refreshToken, err := generateRefreshToken()
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Token error")
			return
		}

		/* ---------------- Persist Session ---------------- */

		err = UpdateUserSession(
			ctx,
			app.DB,
			user.UserID,
			hashRefreshToken(refreshToken),
			uaHash(r),
			ipPrefix(ip),
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Session error")
			return
		}

		/* ---------------- Set Refresh Cookie ---------------- */

		setRefreshCookie(w, refreshToken)

		/* ---------------- Publish Login Event ---------------- */
		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedIn, mqevent.UserLoggedInPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Login successful",
			"data": map[string]string{
				"token":  accessToken,
				"userid": user.UserID,
			},
		})
	}
}

/* ============================================================
   LOGOUT
============================================================ */

func LogoutUser(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		if r.Header.Get("X-Refresh-Intent") != "1" {
			utils.RespondWithError(w, http.StatusForbidden, "CSRF blocked")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		cookie, err := r.Cookie("refresh_token")

		if err == nil && cookie.Value != "" {
			hashed := hashRefreshToken(cookie.Value)

			_ = LogoutUserByRefreshToken(ctx, app.DB, hashed)

			/* -------- Publish Logout Event -------- */
			_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedOut, mqevent.UserLoggedOutPayload{})

		}

		clearRefreshCookie(w)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Logged out",
			"data":    nil,
		})
	}
}

/* ============================================================
   LOGOUT ALL
============================================================ */

func LogoutAllSessions(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		authHeader := r.Header.Get("Authorization")

		if authHeader == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		tokenString := authHeader

		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		err = LogoutAllUserSessions(ctx, app.DB, claims.UserID)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Logout failed")
			return
		}

		/* -------- Publish Logout Event -------- */
		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedOutAllSessions, mqevent.UserLoggedOutPayload{})

		clearRefreshCookie(w)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "All sessions revoked",
		})
	}
}
