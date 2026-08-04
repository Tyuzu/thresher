package domain

import (
	"fmt"
	"strings"
)

const minPasswordLength = 6

// LoginRequest is the canonical auth login contract.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func ValidateLoginRequest(req LoginRequest) (LoginRequest, error) {
	req.Username = strings.TrimSpace(req.Username)
	req.Password = strings.TrimSpace(req.Password)

	if req.Username == "" {
		return LoginRequest{}, fmt.Errorf("username is required")
	}
	if len(req.Password) < minPasswordLength {
		return LoginRequest{}, fmt.Errorf("password must be at least %d characters", minPasswordLength)
	}
	return req, nil
}

// RegisterRequest is the canonical auth registration contract.
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func ValidateRegisterRequest(req RegisterRequest) (RegisterRequest, error) {
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	req.Password = strings.TrimSpace(req.Password)

	if req.Username == "" {
		return RegisterRequest{}, fmt.Errorf("username is required")
	}
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		return RegisterRequest{}, fmt.Errorf("valid email is required")
	}
	if len(req.Password) < minPasswordLength {
		return RegisterRequest{}, fmt.Errorf("password must be at least %d characters", minPasswordLength)
	}
	return req, nil
}

// OTPRequest is the canonical OTP request contract.
type OTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

func ValidateOTPRequest(req OTPRequest) (OTPRequest, error) {
	req.Email = strings.TrimSpace(req.Email)
	req.OTP = strings.TrimSpace(req.OTP)

	if req.Email == "" || !strings.Contains(req.Email, "@") {
		return OTPRequest{}, fmt.Errorf("valid email is required")
	}
	if req.OTP == "" {
		return OTPRequest{}, fmt.Errorf("otp is required")
	}
	return req, nil
}
