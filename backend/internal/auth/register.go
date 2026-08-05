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

	"golang.org/x/crypto/bcrypt"
)

/* ============================================================
   1. HANDLERS (HTTP LAYER)
============================================================ */

func Register(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input SignUpRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		user, err := ProcessRegistration(ctx, app, input)
		if err != nil {
			if errors.Is(err, ErrAuthInvalidCredentials) {
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
		return models.User{}, ErrAuthInvalidCredentials
	}

	// Transform data and perform CPU-bound tasks
	user, err := BuildUser(input)
	if err != nil {
		return models.User{}, ErrPasswordHashing
	}

	// Persist changes
	if err := CreateUser(ctx, app, user); err != nil {
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
