package auth

import (
	"testing"
)

// Test validateUsername function
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

// Test validateEmail function
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

// Test validatePassword function
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
