package authnew_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"naevis/authnew"
	"naevis/infra"
)

func TestLoginDirectly(t *testing.T) {
	deps := &infra.Deps{}

	// Invoke the handler directly without routing overhead
	loginHandler := authnew.Login(deps)

	payload := authnew.LoginRequest{
		Email:    "john@example.com",
		Password: "securepassword123",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	// Execute handler directly
	loginHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}
}
