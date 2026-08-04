package delivery

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/auth/domain"
	"naevis/auth/repo"
	"naevis/auth/usecase"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"

	"golang.org/x/crypto/bcrypt"
)

type LoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterInput struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type OTPInput struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

func NewLoginHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := usecase.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var creds LoginInput
		if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}
		validated, err := domain.ValidateLoginRequest(domain.LoginRequest{Username: creds.Username, Password: creds.Password})
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		creds.Username = validated.Username
		creds.Password = validated.Password

		ip := clientIP(r)
		failKey := fmt.Sprintf("auth:fail:%s:%s", creds.Username, ipPrefix(ip))
		uaHashStr := uaHash(r)
		ipPrefixStr := ipPrefix(ip)

		if isLocked := checkRateLimitLockout(ctx, app, failKey); isLocked {
			utils.RespondWithError(w, http.StatusTooManyRequests, "Too many attempts")
			return
		}

		accessToken, refreshToken, userID, err := uc.AuthenticateAndCreateSession(ctx, creds.Username, creds.Password, uaHashStr, ipPrefixStr)
		if err != nil {
			incrementRateLimitCounter(ctx, app, failKey)
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		_ = clearRateLimitCounter(ctx, app, failKey)
		setRefreshCookie(w, refreshToken)
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserLoggedIn, mqevent.UserLoggedInPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"message": "Login successful",
			"status":  http.StatusOK,
			"token":   accessToken,
			"userID":  userID,
		})
	}
}

func NewRegisterHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := usecase.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input RegisterInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}
		validated, err := domain.ValidateRegisterRequest(domain.RegisterRequest{Username: input.Username, Email: input.Email, Password: input.Password})
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		input.Username = validated.Username
		input.Email = validated.Email
		input.Password = validated.Password

		userModel, err := buildUser(input)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Registration failed")
			return
		}

		if err := uc.RegisterUser(ctx, userModel); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Registration failed")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"message": "User registered successfully",
			"userID":  userModel.UserID,
		})
	}
}

func NewRequestOTPHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := usecase.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input OTPInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}
		validated, err := domain.ValidateOTPRequest(domain.OTPRequest{Email: input.Email, OTP: input.OTP})
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := uc.ProcessOTPRequest(ctx, strings.TrimSpace(validated.Email)); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "OTP sent if the email exists"})
	}
}

func NewVerifyOTPHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := usecase.NewAuthUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input OTPInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}
		validated, err := domain.ValidateOTPRequest(domain.OTPRequest{Email: input.Email, OTP: input.OTP})
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := uc.ProcessOTPVerification(ctx, strings.TrimSpace(validated.Email), strings.TrimSpace(validated.OTP)); err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired OTP")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "User verified successfully"})
	}
}

func clientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return strings.TrimSpace(ip)
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func ipPrefix(ip string) string {
	if ip == "" {
		return "unknown"
	}
	if host, _, err := net.SplitHostPort(ip); err == nil {
		return host
	}
	return ip
}

func uaHash(r *http.Request) string {
	return fmt.Sprintf("%x", sha256.Sum256([]byte(r.UserAgent())))
}

func checkRateLimitLockout(ctx context.Context, app *infra.Deps, failKey string) bool {
	val, err := app.Cache.Get(ctx, failKey)
	if err != nil || len(val) == 0 {
		return false
	}
	cnt, err := strconv.ParseInt(string(val), 10, 64)
	if err != nil {
		return false
	}
	return cnt >= 5
}

func incrementRateLimitCounter(ctx context.Context, app *infra.Deps, failKey string) {
	cnt, err := app.Cache.Incr(ctx, failKey)
	if err != nil {
		log.Printf("warn: failed to increment auth fail count: %v", err)
		return
	}
	if err := app.Cache.Set(ctx, failKey, []byte(strconv.FormatInt(cnt, 10)), 5*time.Minute); err != nil {
		log.Printf("warn: failed to persist auth fail count: %v", err)
	}
}

func clearRateLimitCounter(ctx context.Context, app *infra.Deps, failKey string) error {
	return app.Cache.Del(ctx, failKey)
}

func setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60,
	})
}

func buildUser(input RegisterInput) (models.User, error) {
	if input.Username == "" || input.Email == "" || input.Password == "" {
		return models.User{}, errors.New("missing required fields")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return models.User{}, err
	}
	id, err := utils.GenerateRandomString(12)
	if err != nil {
		return models.User{}, err
	}
	return models.User{
		UserID:    "u" + id,
		Username:  strings.TrimSpace(input.Username),
		Email:     strings.ToLower(strings.TrimSpace(input.Email)),
		Password:  string(hash),
		Role:      []string{"user"},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}

var _ = buildUser
