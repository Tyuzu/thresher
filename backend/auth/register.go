package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// Custom domain errors for clean handler matching
var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrPasswordHashing    = errors.New("password processing error")
	ErrUserAlreadyExists  = errors.New("user already exists")
)

/* ============================================================
   1. HANDLERS (HTTP LAYER)
============================================================ */

func Register(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input SignUpRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		user, err := ProcessRegistration(ctx, app, input)
		if err != nil {
			if errors.Is(err, ErrInvalidCredentials) {
				utils.RespondWithError(w, http.StatusBadRequest, "Invalid credentials")
				return
			}
			if errors.Is(err, ErrUserAlreadyExists) {
				utils.RespondWithError(w, http.StatusConflict, "User already exists")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "Registration failed")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, SignUpResponse{
			Message: "User registered successfully",
			UserID:  user.UserID,
		})
	}
}

/* ============================================================
   2. SERVICES (BUSINESS LAYER)
============================================================ */

func ProcessRegistration(ctx context.Context, app *infra.Deps, input SignUpRequest) (models.User, error) {
	// Sanitize values
	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	// Validate formats
	if !validateUsername(input.Username) ||
		!validateEmail(input.Email) ||
		!validatePassword(input.Password) {
		return models.User{}, ErrInvalidCredentials
	}

	// Transform data and perform CPU-bound tasks
	user, err := BuildUser(input)
	if err != nil {
		return models.User{}, ErrPasswordHashing
	}

	// Persist changes and emit event triggers via structural layer definitions
	if err := PersistNewUser(ctx, app, user); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return models.User{}, ErrUserAlreadyExists
		}
		return models.User{}, err
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserRegistered, mqevent.UserRegisteredPayload{})

	return user, nil
}

// BuildUser handles purely mapping request values to a state model entity structure
func BuildUser(input SignUpRequest) (models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return models.User{}, err
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

	return user, nil
}

/* ============================================================
   3. REPOSITORIES (DATA ACCESS LAYER)
============================================================ */

func PersistNewUser(ctx context.Context, app *infra.Deps, user models.User) error {
	return CreateUser(ctx, app, user)
}
