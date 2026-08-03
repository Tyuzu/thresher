package domain

import (
	"context"

	"naevis/models"
)

// AuthRepository defines persistence operations required by the auth usecases.
type AuthRepository interface {
	CreateUser(ctx context.Context, user models.User) error
	FindUserByUsername(ctx context.Context, username string) (models.User, error)
	UpdateUserSession(ctx context.Context, userID, refreshTokenHash, ua, ip string) error
	LogoutUserByRefreshToken(ctx context.Context, hashedToken string) error
	LogoutAllUserSessions(ctx context.Context, userID string) error
	FindValidRefreshSession(ctx context.Context, hashedToken string) (models.User, error)
	InvalidateUserSession(ctx context.Context, userID string) error
	RotateRefreshTokenForUser(ctx context.Context, userID, newRefreshHash, prevRefreshHash, ua string) error
	VerifyUserEmail(ctx context.Context, email string) error

	// Cache helpers for OTP
	SaveOTPCache(ctx context.Context, email, hashedOTP string) error
	GetOTPCache(ctx context.Context, email string) ([]byte, error)
	DeleteOTPCache(ctx context.Context, email string) error
}
