package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"naevis/auth/delivery"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

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

func Register(app *infra.Deps) http.HandlerFunc {
	return delivery.NewRegisterHandler(app)
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

	rndmstr, _ := utils.GenerateRandomString(10)
	now := time.Now()
	user := models.User{
		UserID:        "u" + rndmstr,
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
