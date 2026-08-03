package domain

import (
	"context"

	"naevis/models"
)

// ProfileRepository defines persistence operations required by profile usecases.
type ProfileRepository interface {
	GetUserByID(ctx context.Context, userID string) (models.User, error)
	GetUserByUsername(ctx context.Context, username string) (models.User, error)
	GetUserFollowData(ctx context.Context, userID string) (models.UserFollow, error)

	// Cache operations
	IsOnline(ctx context.Context, userID string) (bool, error)
	CacheProfile(ctx context.Context, username string, data string, ttl int64) error
	GetCachedProfile(ctx context.Context, username string) (string, error)
	InvalidateCachedProfile(ctx context.Context, username string) error

	UpdateUser(ctx context.Context, userID string, updates map[string]any) error
	DeleteUserByID(ctx context.Context, userID string) (int64, error)
}
