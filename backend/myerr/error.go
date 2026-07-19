package myerr

import "errors"

// Custom errors for handling explicit HTTP mapping statuses out of services
var (
	ErrInvalidInput        = errors.New("invalid input")
	ErrInvalidEmail        = errors.New("invalid email")
	ErrOTPInvalidOrExpired = errors.New("invalid or expired otp")
	ErrInternalProcessing  = errors.New("internal server error")
)
