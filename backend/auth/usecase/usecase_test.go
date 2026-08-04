package usecase
package usecase

import (
	"testing"

	"naevis/auth/domain"
)

func TestValidateLoginRequestRejectsShortPassword(t *testing.T) {
	_, err := domain.ValidateLoginRequest(domain.LoginRequest{Username: "alice", Password: "123"})
	if err == nil {
		t.Fatal("expected validation error for short password")
	}
}

func TestValidateRegisterRequestAcceptsValidUser(t *testing.T) {
	req := domain.RegisterRequest{Username: "alice", Email: "alice@example.com", Password: "secret123"}
	validated, err := domain.ValidateRegisterRequest(req)
	if err != nil {
		t.Fatalf("expected valid request, got %v", err)
	}
	if validated.Email != req.Email {
		t.Fatalf("expected email preserved, got %q", validated.Email)
	}
}
