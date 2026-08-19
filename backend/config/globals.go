package config

import (
	"context"
)

var (
	// tokenSigningAlgo = jwt.SigningMethodHS256
	JwtSecret          = []byte("your_secret_key") // Replace with a secure secret key
	RefreshTokenSecret = []byte("your_secret_key")
)

// Context keys
type ContextKey string

const RoleKey ContextKey = "role"
const UserIDKey ContextKey = "userid"
const UserNameKey ContextKey = "userName"

var Ctx = context.Background()
