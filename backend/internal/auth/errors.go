package auth

import "errors"

var (
	ErrAuthInvalidCredentials = errors.New("invalid credentials")
	ErrTokenGeneration        = errors.New("token error")
	ErrSessionPersistence     = errors.New("session error")
	ErrRateLimitExceeded      = errors.New("too many attempts")
)

// Custom domain errors for clean handler matching
var (
	ErrPasswordHashing   = errors.New("password processing error")
	ErrUserAlreadyExists = errors.New("user already exists")
)
