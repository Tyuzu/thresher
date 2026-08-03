package authnew_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"naevis/authnew"
	"naevis/infra"
)

// MockAuthDB provides an in-memory implementation of authnew.AuthDB for tests.
type MockAuthDB struct {
	Users map[string]*authnew.User
}

func NewMockAuthDB() *MockAuthDB {
	return &MockAuthDB{Users: make(map[string]*authnew.User)}
}

func (m *MockAuthDB) CreateUser(ctx context.Context, user *authnew.User) error {
	m.Users[user.Email] = user
	return nil
}

func (m *MockAuthDB) GetUserByEmail(ctx context.Context, email string) (*authnew.User, error) {
	if u, ok := m.Users[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *MockAuthDB) GetUserByUsername(ctx context.Context, username string) (*authnew.User, error) {
	for _, u := range m.Users {
		if u.Username == username {
			return u, nil
		}
	}
	return nil, nil
}

func (m *MockAuthDB) SaveOTP(ctx context.Context, email, otp string) error { return nil }
func (m *MockAuthDB) VerifyOTP(ctx context.Context, email, otp string) (bool, error) {
	return true, nil
}
func (m *MockAuthDB) RevokeToken(ctx context.Context, token string) error { return nil }
func (m *MockAuthDB) RevokeAllUserTokens(ctx context.Context, userID string) error {
	return nil
}

func TestLoginDirectly(t *testing.T) {
	deps := &infra.Deps{}
	mockDB := NewMockAuthDB()

	// Seed user for login test
	mockDB.Users["john@example.com"] = &authnew.User{
		Email:    "john@example.com",
		Password: "securepassword123",
	}

	loginHandler := authnew.Login(deps, mockDB)

	payload := authnew.LoginRequest{
		Email:    "john@example.com",
		Password: "securepassword123",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	loginHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}
}
