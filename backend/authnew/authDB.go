package authnew

import "context"

// User represents the core user domain model for auth
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthDB abstracts all database interactions required by the auth package,
// making the underlying database completely swappable.
type AuthDB interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByUsername(ctx context.Context, username string) (*User, error)
	SaveOTP(ctx context.Context, email, otp string) error
	VerifyOTP(ctx context.Context, email, otp string) (bool, error)
	RevokeToken(ctx context.Context, token string) error
	RevokeAllUserTokens(ctx context.Context, userID string) error
}
