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

// Custom errors for handling explicit HTTP mapping statuses out of services
var (
	ErrInvalidInput        = errors.New("invalid input")
	ErrInvalidEmail        = errors.New("invalid email")
	ErrOTPInvalidOrExpired = errors.New("invalid or expired otp")
	ErrInternalProcessing  = errors.New("internal server error")
)
