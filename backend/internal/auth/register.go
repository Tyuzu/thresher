package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"

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

func ProcessRegistration(ctx context.Context, app *infra.Deps, input SignUpRequest) (User, error) {
	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	if !validateUsername(input.Username) ||
		!validateEmail(input.Email) ||
		!validatePassword(input.Password) {
		return User{}, ErrAuthInvalidCredentials
	}

	user, err := BuildUser(input)
	if err != nil {
		return User{}, ErrPasswordHashing
	}

	if err := CreateUser(ctx, app, user); err != nil {
		return User{}, err
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserRegistered, mqevent.UserRegisteredPayload{
		UserID:     user.UserID,
		Username:   user.Username,
		Email:      user.Email,
		OccurredAt: time.Now().UTC(),
	})

	return user, nil
}

func BuildUser(input SignUpRequest) (User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return User{}, err
	}

	now := time.Now()
	user := User{
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
