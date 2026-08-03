package utils

import (
	"crypto/rand"
	"math/big"

	"net/http"
)

const (
	letters = "abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	digits  = "0123456789"
)

// CSRF handles endpoint CSRF token responses.
func CSRF(w http.ResponseWriter, r *http.Request) {
	token, err := GenerateRandomString(12)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"csrf_token": token,
	})
}

// GenerateRandomString generates a cryptographically secure random string.
func GenerateRandomString(n int) (string, error) {
	return generateFromCharset(n, letters)
}

// GenerateRandomDigitString generates a cryptographically secure numeric string.
func GenerateRandomDigitString(n int) (string, error) {
	return generateFromCharset(n, digits)
}

func generateFromCharset(n int, charset string) (string, error) {
	bytes := make([]byte, n)
	max := big.NewInt(int64(len(charset)))

	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		bytes[i] = charset[num.Int64()]
	}

	return string(bytes), nil
}
