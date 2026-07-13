package auth

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/models"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type mockDatabase struct {
	insertErr     error
	findOneErr    error
	findOneResult any
	updateErr     error
	insertFunc    func(ctx context.Context, collection string, document any) error
	findOneFunc   func(ctx context.Context, collection string, filter any, result any) error
	updateFunc    func(ctx context.Context, collection string, filter any, update any) error
}

func (m *mockDatabase) Ping(ctx context.Context) error {
	return nil
}

func (m *mockDatabase) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}

func (m *mockDatabase) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

func (m *mockDatabase) Insert(ctx context.Context, collection string, document any) error {
	if m.insertFunc != nil {
		return m.insertFunc(ctx, collection, document)
	}
	return m.insertErr
}

func (m *mockDatabase) InsertOne(ctx context.Context, collection string, document any) error {
	return m.Insert(ctx, collection, document)
}

func (m *mockDatabase) InsertMany(ctx context.Context, collection string, documents []any) error {
	return nil
}

func (m *mockDatabase) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}

func (m *mockDatabase) FindOne(ctx context.Context, collection string, filter any, result any) error {
	if m.findOneFunc != nil {
		return m.findOneFunc(ctx, collection, filter, result)
	}
	if m.findOneErr != nil {
		return m.findOneErr
	}
	if m.findOneResult == nil {
		return nil
	}
	return copyAny(m.findOneResult, result)
}

func (m *mockDatabase) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return m.FindOne(ctx, collection, filter, result)
}

func (m *mockDatabase) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	return nil
}

func (m *mockDatabase) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	return nil
}

func (m *mockDatabase) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return nil
}

func (m *mockDatabase) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}

func (m *mockDatabase) Update(ctx context.Context, collection string, filter any, update any) error {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, collection, filter, update)
	}
	return m.updateErr
}

func (m *mockDatabase) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	return m.Update(ctx, collection, filter, update)
}

func (m *mockDatabase) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}

func (m *mockDatabase) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}

func (m *mockDatabase) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	return nil
}

func (m *mockDatabase) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	return nil
}

func (m *mockDatabase) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockDatabase) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockDatabase) DeleteMany(ctx context.Context, collection string, filter any) error {
	return nil
}

func (m *mockDatabase) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	return nil
}

func (m *mockDatabase) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	return nil
}

func (m *mockDatabase) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockDatabase) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockDatabase) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

type mockCache struct {
	getFunc           func(ctx context.Context, key string) ([]byte, error)
	setFunc           func(ctx context.Context, key string, value []byte, ttl time.Duration) error
	setNXFunc         func(ctx context.Context, key string, value []byte, ttl time.Duration) (bool, error)
	setWithExpiryFunc func(ctx context.Context, key string, value []byte, ttl time.Duration) error
	existsFunc        func(ctx context.Context, key string) (bool, error)
	delFunc           func(ctx context.Context, key string) error
	hsetFunc          func(ctx context.Context, key, field string, value []byte) error
	hgetFunc          func(ctx context.Context, key, field string) ([]byte, error)
	hdelFunc          func(ctx context.Context, key, field string) (bool, error)
	incrFunc          func(ctx context.Context, key string) (int64, error)
}

func (m *mockCache) Get(ctx context.Context, key string) ([]byte, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, key)
	}
	return nil, fmt.Errorf("not implemented")
}

func (m *mockCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if m.setFunc != nil {
		return m.setFunc(ctx, key, value, ttl)
	}
	return nil
}

func (m *mockCache) SetNX(ctx context.Context, key string, value []byte, ttl time.Duration) (bool, error) {
	if m.setNXFunc != nil {
		return m.setNXFunc(ctx, key, value, ttl)
	}
	return true, nil
}

func (m *mockCache) SetWithExpiry(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if m.setWithExpiryFunc != nil {
		return m.setWithExpiryFunc(ctx, key, value, ttl)
	}
	return nil
}

func (m *mockCache) Exists(ctx context.Context, key string) (bool, error) {
	if m.existsFunc != nil {
		return m.existsFunc(ctx, key)
	}
	return false, nil
}

func (m *mockCache) Del(ctx context.Context, key string) error {
	if m.delFunc != nil {
		return m.delFunc(ctx, key)
	}
	return nil
}

func (m *mockCache) HSet(ctx context.Context, key, field string, value []byte) error {
	if m.hsetFunc != nil {
		return m.hsetFunc(ctx, key, field, value)
	}
	return nil
}

func (m *mockCache) HGet(ctx context.Context, key, field string) ([]byte, error) {
	if m.hgetFunc != nil {
		return m.hgetFunc(ctx, key, field)
	}
	return nil, nil
}

func (m *mockCache) HDel(ctx context.Context, key, field string) (bool, error) {
	if m.hdelFunc != nil {
		return m.hdelFunc(ctx, key, field)
	}
	return false, nil
}

func (m *mockCache) Incr(ctx context.Context, key string) (int64, error) {
	if m.incrFunc != nil {
		return m.incrFunc(ctx, key)
	}
	return 0, nil
}

type mockMQ struct{}

func (m *mockMQ) Publish(ctx context.Context, subject string, data []byte) error {
	return nil
}

func (m *mockMQ) Ping(ctx context.Context) error {
	return nil
}

func (m *mockMQ) Subscribe(ctx context.Context, subject string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

func (m *mockMQ) QueueSubscribe(ctx context.Context, subject string, queue string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

func copyAny(src, dest any) error {
	if u, ok := src.(models.User); ok {
		if out, ok := dest.(*models.User); ok {
			*out = u
			return nil
		}
	}

	b, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dest)
}

func jsonBody(v any) *bytes.Reader {
	b, _ := json.Marshal(v)
	return bytes.NewReader(b)
}

func makeJWTToken(userID, username string, roles []string) string {
	claims := &models.Claims{
		UserID:   userID,
		Username: username,
		Role:     roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, _ := tok.SignedString(config.JwtSecret)
	return ss
}

func TestSanitizeEmailAddress(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "valid simple", input: "User@Example.com", want: "user@example.com"},
		{name: "valid display name", input: "User Name <user@example.com>", want: "user@example.com"},
		{name: "invalid address", input: "not-an-email", wantErr: true},
		{name: "empty value", input: "   ", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := sanitizeEmailAddress(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("sanitizeEmailAddress(%q) error = nil, want error", tt.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("sanitizeEmailAddress(%q) unexpected error: %v", tt.input, err)
			}
			if got != tt.want {
				t.Fatalf("sanitizeEmailAddress(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name     string
		username string
		want     bool
	}{
		{"valid simple", "user123", true},
		{"valid with underscore", "user_name", true},
		{"valid 3 chars", "abc", true},
		{"valid 20 chars", "12345678901234567890", true},
		{"too short", "ab", false},
		{"too long", "123456789012345678901", false},
		{"with space", "user name", false},
		{"with dash", "user-name", false},
		{"with special char", "user@name", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateUsername(tt.username)
			if got != tt.want {
				t.Errorf("validateUsername(%q) = %v, want %v", tt.username, got, tt.want)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  bool
	}{
		{"valid email", "user@example.com", true},
		{"valid with plus", "user+tag@example.co.uk", true},
		{"valid subdomain", "user@mail.example.com", true},
		{"missing @", "userexample.com", false},
		{"missing domain", "user@", false},
		{"missing local", "@example.com", false},
		{"with space", "user @example.com", false},
		{"empty", "", false},
		{"double @", "user@@example.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validateEmail(tt.email)
			if got != tt.want {
				t.Errorf("validateEmail(%q) = %v, want %v", tt.email, got, tt.want)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		want     bool
	}{
		{"valid short", "123456", true},
		{"valid long", "verylongstrongpassword123!", true},
		{"too short", "12345", false},
		{"empty", "", false},
		{"special chars", "P@ssw0rd!", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validatePassword(tt.password)
			if got != tt.want {
				t.Errorf("validatePassword(%q) = %v, want %v", tt.password, got, tt.want)
			}
		})
	}
}

func TestRegisterHandlerSuccess(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/register", jsonBody(map[string]string{
		"username": "testuser",
		"password": "password1",
		"email":    "user@example.com",
	}))
	rec := httptest.NewRecorder()

	deps := &infra.Deps{
		DB:    &mockDatabase{},
		Cache: &mockCache{},
		MQ:    &mockMQ{},
	}

	Register(deps)(rec, req, nil)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d got %d", http.StatusCreated, rec.Code)
	}

	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body["message"] != "User registered successfully" {
		t.Fatalf("unexpected message: %v", body["message"])
	}
	if body["userid"] == "" {
		t.Fatalf("expected userid in response")
	}
}

func TestLoginHandlerSuccess(t *testing.T) {
	hashed, _ := bcrypt.GenerateFromPassword([]byte("password1"), bcrypt.DefaultCost)
	user := models.User{
		UserID:   "u123",
		Username: "testuser",
		Password: string(hashed),
		Role:     []string{"user"},
	}

	deps := &infra.Deps{
		DB: &mockDatabase{
			findOneFunc: func(ctx context.Context, collection string, filter any, result any) error {
				return copyAny(user, result)
			},
		},
		Cache: &mockCache{
			getFunc: func(ctx context.Context, key string) ([]byte, error) {
				return nil, nil
			},
			delFunc: func(ctx context.Context, key string) error {
				return nil
			},
		},
		MQ: &mockMQ{},
	}

	req := httptest.NewRequest(http.MethodPost, "/login", jsonBody(map[string]string{
		"username": "testuser",
		"password": "password1",
	}))
	rec := httptest.NewRecorder()

	Login(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d; body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body["message"] != "Login successful" {
		t.Fatalf("unexpected message: %v", body["message"])
	}
	data, ok := body["data"].(map[string]any)
	if !ok || data["userid"] != "u123" {
		t.Fatalf("expected userid u123, got %v", data["userid"])
	}
}

func TestLogoutUserHandlerSuccess(t *testing.T) {
	deps := &infra.Deps{
		DB:    &mockDatabase{},
		Cache: &mockCache{},
		MQ:    &mockMQ{},
	}

	req := httptest.NewRequest(http.MethodPost, "/logout", nil)
	req.Header.Set("X-Refresh-Intent", "1")
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: "tokenvalue"})
	rec := httptest.NewRecorder()

	LogoutUser(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestLogoutAllSessionsHandlerSuccess(t *testing.T) {
	token := makeJWTToken("u123", "testuser", []string{"user"})
	deps := &infra.Deps{
		DB:    &mockDatabase{},
		Cache: &mockCache{},
		MQ:    &mockMQ{},
	}

	req := httptest.NewRequest(http.MethodPost, "/logout_all", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	LogoutAllSessions(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestRequestOTPHandlerSuccess(t *testing.T) {
	os.Setenv("SMTP_USER", "")
	os.Setenv("SMTP_PASS", "")
	os.Setenv("SMTP_HOST", "")
	os.Setenv("SMTP_PORT", "")

	deps := &infra.Deps{
		DB: &mockDatabase{},
		Cache: &mockCache{
			setWithExpiryFunc: func(ctx context.Context, key string, value []byte, ttl time.Duration) error {
				return nil
			},
		},
		MQ: &mockMQ{},
	}

	req := httptest.NewRequest(http.MethodPost, "/otp/request", jsonBody(map[string]string{
		"email": "user@example.com",
	}))
	rec := httptest.NewRecorder()

	RequestOTPHandler(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestVerifyOTPHandlerSuccess(t *testing.T) {
	otp := "123456"
	hashed := hashPlainSHA256(otp)
	deps := &infra.Deps{
		DB: &mockDatabase{
			updateFunc: func(ctx context.Context, collection string, filter any, update any) error {
				return nil
			},
		},
		Cache: &mockCache{
			getFunc: func(ctx context.Context, key string) ([]byte, error) {
				return []byte(hashed), nil
			},
			delFunc: func(ctx context.Context, key string) error {
				return nil
			},
		},
		MQ: &mockMQ{},
	}

	req := httptest.NewRequest(http.MethodPost, "/otp/verify", jsonBody(map[string]string{
		"email": "user@example.com",
		"otp":   otp,
	}))
	rec := httptest.NewRecorder()

	VerifyOTPHandler(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestRefreshTokenHandlerSuccess(t *testing.T) {
	rawToken := "refresh-token"
	hashed := hashRefreshToken(rawToken)
	ua := "test-agent"
	deps := &infra.Deps{
		DB: &mockDatabase{
			findOneResult: models.User{
				UserID:       "u123",
				Username:     "testuser",
				Role:         []string{"user"},
				RefreshToken: hashed,
				RefreshPrev:  "",
				RefreshUA:    fmt.Sprintf("%x", sha256.Sum256([]byte(ua))),
			},
			updateFunc: func(ctx context.Context, collection string, filter any, update any) error {
				return nil
			},
		},
		Cache: &mockCache{},
		MQ:    &mockMQ{},
	}

	req := httptest.NewRequest(http.MethodPost, "/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: rawToken})
	req.Header.Set("User-Agent", ua)
	rec := httptest.NewRecorder()

	RefreshToken(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}
