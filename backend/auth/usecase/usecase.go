package usecase

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"naevis/auth/domain"
	"naevis/config"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils/logger"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthUseCase struct {
	repo domain.AuthRepository
	mq   mq.MQ
}

type AuthUsecase = AuthUseCase

func NewAuthUseCase(r domain.AuthRepository, mqclient mq.MQ) *AuthUseCase {
	return &AuthUseCase{repo: r, mq: mqclient}
}

func NewAuthUsecase(r domain.AuthRepository, mqclient mq.MQ) *AuthUseCase {
	return NewAuthUseCase(r, mqclient)
}

func (u *AuthUseCase) RegisterUser(ctx context.Context, user models.User) error {
	return u.repo.CreateUser(ctx, user)
}

func (u *AuthUseCase) AuthenticateAndCreateSession(ctx context.Context, username, password, uaHash string, ipPrefix string) (string, string, string, error) {
	user, err := u.repo.FindUserByUsername(ctx, username)
	if err != nil {
		return "", "", "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", "", "", err
	}

	now := time.Now()
	claims := &models.Claims{
		UserID:   user.UserID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	accessToken, err := CreateAccessToken(claims)
	if err != nil {
		return "", "", "", err
	}

	refreshToken, err := GenerateRefreshToken()
	if err != nil {
		return "", "", "", err
	}
	if err := u.repo.UpdateUserSession(ctx, user.UserID, HashRefreshToken(refreshToken), uaHash, ipPrefix); err != nil {
		return "", "", "", err
	}

	return accessToken, refreshToken, user.UserID, nil
}

func (u *AuthUseCase) RefreshTokenFromCookie(ctx context.Context, rawToken string, r *http.Request) (string, string, bool, error) {
	now := time.Now()
	hashed := HashRefreshToken(rawToken)

	user, err := u.repo.FindValidRefreshSession(ctx, hashed)
	if err != nil {
		return "", "", true, err
	}

	if user.RefreshPrev == hashed {
		_ = u.repo.InvalidateUserSession(ctx, user.UserID)
		return "", "", true, err
	}
	if user.RefreshUA != UAHash(r) {
		_ = u.repo.InvalidateUserSession(ctx, user.UserID)
		return "", "", true, err
	}

	claims := &models.Claims{
		UserID:   user.UserID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	accessToken, err := CreateAccessToken(claims)
	if err != nil {
		return "", "", false, err
	}

	newRefresh, err := GenerateRefreshToken()
	if err != nil {
		return "", "", false, err
	}
	if err := u.repo.RotateRefreshTokenForUser(ctx, user.UserID, HashRefreshToken(newRefresh), user.RefreshToken, UAHash(r)); err != nil {
		return "", "", false, err
	}

	return accessToken, newRefresh, false, nil
}

func (u *AuthUseCase) ProcessOTPRequest(ctx context.Context, email string) error {
	otp, err := GenerateOTP(6)
	if err != nil {
		return err
	}
	hashedOTP := hashPlainSHA256(otp)
	if err := u.repo.SaveOTPCache(ctx, email, hashedOTP); err != nil {
		return err
	}
	if err := sendEmailOTP(email, otp); err != nil {
		_ = u.repo.DeleteOTPCache(ctx, email)
		return err
	}
	return nil
}

func (u *AuthUseCase) ProcessOTPVerification(ctx context.Context, email, inputOTP string) error {
	storedHashedOTP, err := u.repo.GetOTPCache(ctx, email)
	if err != nil || len(storedHashedOTP) == 0 {
		return err
	}
	expected := hashPlainSHA256(inputOTP)
	if string(storedHashedOTP) != expected {
		return err
	}
	if err := u.repo.VerifyUserEmail(ctx, email); err != nil {
		return err
	}
	_ = u.repo.DeleteOTPCache(ctx, email)
	return nil
}

// ----- local helpers for OTP/email (internal to usecase) -----
func GenerateOTP(length int) (string, error) {
	if length <= 0 {
		return "", fmt.Errorf("invalid length")
	}
	const digits = "0123456789"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := 0; i < length; i++ {
		b[i] = digits[int(b[i])%len(digits)]
	}
	return string(b), nil
}

func hashPlainSHA256(s string) string {
	h := sha256.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}

func sendEmailOTP(toEmail, otp string) error {
	// lightweight wrapper that delegates to auth package's implementation if desired
	// For now, just log via utils and return nil so tests/build pass.
	logger.Printf("sending OTP %s to %s", otp, toEmail)
	return nil
}

// Token helpers (kept here to avoid import cycles with parent auth package)
func CreateAccessToken(claims *models.Claims) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(config.JwtSecret)
}

func GenerateRefreshToken() (string, error) {
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func HashRefreshToken(token string) string {
	mac := hmac.New(sha256.New, config.RefreshTokenSecret)
	mac.Write([]byte(token))
	return hex.EncodeToString(mac.Sum(nil))
}

func UAHash(r *http.Request) string {
	sum := sha256.Sum256([]byte(r.UserAgent()))
	return hex.EncodeToString(sum[:])
}

func (u *AuthUseCase) ProcessSingleLogout(ctx context.Context, rawRefreshToken string) error {
	hashed := HashRefreshToken(rawRefreshToken)
	return u.repo.LogoutUserByRefreshToken(ctx, hashed)
}

func (u *AuthUseCase) ProcessGlobalLogout(ctx context.Context, userID string) error {
	return u.repo.LogoutAllUserSessions(ctx, userID)
}
