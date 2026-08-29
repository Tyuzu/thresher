package middleware

import (
	"fmt"
	"scav/config"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// ----------------------
// JWT Helpers
// ----------------------

func ExtractBearerToken(header string) string {
	if len(header) > 7 && strings.HasPrefix(header, "Bearer ") {
		return header[7:]
	}
	return ""
}

func ParseToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		return config.JwtSecret, nil
	})
	if err != nil || claims.UserID == "" {
		return nil, fmt.Errorf("unauthorized: %w", err)
	}
	return claims, nil
}

func ValidateJWT(tokenString string) (*Claims, error) {
	tokenString = ExtractBearerToken(tokenString)
	if tokenString == "" {
		return nil, fmt.Errorf("invalid token")
	}
	return ParseToken(tokenString)
}
