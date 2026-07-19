package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/myerr"
	"naevis/utils"
	"naevis/utils/logger"

	"github.com/julienschmidt/httprouter"
)

const OTPExpiry = 10 * time.Minute

/* ============================================================
   1. HANDLERS (HTTP LAYER)
============================================================ */

func RequestOTPHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input RequestOTPInput
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		if err := dec.Decode(&input); err != nil || input.Email == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		err := ProcessOTPRequest(ctx, app, input.Email)
		if err != nil {
			if errors.Is(err, myerr.ErrInvalidEmail) {
				utils.RespondWithError(w, http.StatusBadRequest, "Invalid email")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "OTP sent if the email exists",
		})
	}
}

func VerifyOTPHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var input VerifyOTPInput
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		if err := dec.Decode(&input); err != nil || input.Email == "" || input.OTP == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid input")
			return
		}

		err := ProcessOTPVerification(ctx, app, input.Email, input.OTP)
		if err != nil {
			if errors.Is(err, myerr.ErrInvalidEmail) {
				utils.RespondWithError(w, http.StatusBadRequest, "Invalid email")
				return
			}
			if errors.Is(err, myerr.ErrOTPInvalidOrExpired) {
				utils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired OTP")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to verify user")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "User verified successfully",
		})
	}
}

/* ============================================================
   2. SERVICES (BUSINESS LAYER)
============================================================ */

func ProcessOTPRequest(ctx context.Context, app *infra.Deps, rawEmail string) error {
	email, err := sanitizeEmailAddress(rawEmail)
	if err != nil {
		return myerr.ErrInvalidEmail
	}

	otp, err := GenerateOTP(6)
	if err != nil {
		return errors.New("Failed to generate OTP")
	}

	hashedOTP := hashPlainSHA256(otp)

	if err = SaveOTPCache(ctx, app, email, hashedOTP); err != nil {
		return errors.New("Failed to store OTP")
	}

	if err = SendEmailOTP(email, otp); err != nil {
		_ = DeleteOTPCache(ctx, app, email)
		return errors.New("Failed to send OTP")
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.OTPRequested, mqevent.UserOTPPayload{})
	return nil
}

func ProcessOTPVerification(ctx context.Context, app *infra.Deps, rawEmail, inputOTP string) error {
	email, err := sanitizeEmailAddress(rawEmail)
	if err != nil {
		return myerr.ErrInvalidEmail
	}

	storedHashedOTP, err := GetOTPCache(ctx, app, email)
	if err != nil || len(storedHashedOTP) == 0 {
		return myerr.ErrOTPInvalidOrExpired
	}

	expectedHashedOTP := hashPlainSHA256(inputOTP)
	if subtle.ConstantTimeCompare([]byte(storedHashedOTP), []byte(expectedHashedOTP)) != 1 {
		return myerr.ErrOTPInvalidOrExpired
	}

	if err = UpdateUserVerificationStatus(ctx, app, email); err != nil {
		return err
	}

	_ = DeleteOTPCache(ctx, app, email)
	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.OTPVerified, mqevent.UserOTPPayload{})

	return nil
}

func GenerateOTP(length int) (string, error) {
	if length <= 0 {
		return "", errors.New("invalid length")
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

func sanitizeEmailAddress(raw string) (string, error) {
	address := strings.TrimSpace(raw)
	if address == "" || strings.ContainsAny(address, "\r\n") {
		return "", errors.New("invalid email")
	}

	parsed, err := mail.ParseAddress(address)
	if err != nil || parsed.Address == "" {
		return "", errors.New("invalid email")
	}

	email := strings.ToLower(strings.TrimSpace(parsed.Address))
	if !validateEmail(email) {
		return "", errors.New("invalid email")
	}

	return email, nil
}

func hashPlainSHA256(s string) string {
	h := sha256.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}

func SendEmailOTP(toEmail, otp string) error {
	recipient, err := sanitizeEmailAddress(toEmail)
	if err != nil {
		return err
	}

	go func(recipient string) {
		from := strings.TrimSpace(os.Getenv("SMTP_USER"))
		pass := os.Getenv("SMTP_PASS")
		host := strings.TrimSpace(os.Getenv("SMTP_HOST"))
		port := strings.TrimSpace(os.Getenv("SMTP_PORT"))
		if from == "" || pass == "" || host == "" || port == "" {
			logger.Printf("warn: SMTP not configured")
			return
		}
		parsedFrom, err := mail.ParseAddress(from)
		if err != nil || parsedFrom == nil || parsedFrom.Address == "" {
			logger.Printf("warn: invalid SMTP sender address")
			return
		}
		fromAddr := parsedFrom.Address
		portNum, err := strconv.Atoi(port)
		if err != nil || portNum < 1 || portNum > 65535 {
			logger.Printf("warn: invalid SMTP port")
			return
		}
		if strings.ContainsAny(host, "\r\n\t ") || strings.Contains(host, "/") {
			logger.Printf("warn: invalid SMTP host")
			return
		}
		msg := fmt.Appendf(nil, "Subject: Email Verification\r\n\r\nYour OTP is: %s\r\nIt expires in 10 minutes.\r\n", otp)
		auth := smtp.PlainAuth("", fromAddr, pass, host)
		serverAddr := net.JoinHostPort(host, port)
		client, err := smtp.Dial(serverAddr)
		if err != nil {
			logger.Printf("warn: failed to connect to SMTP server: %v", err)
			return
		}
		defer func() { _ = client.Close() }()
		if err := client.Hello("localhost"); err != nil {
			logger.Printf("warn: failed to start SMTP conversation: %v", err)
			return
		}
		if err := client.Auth(auth); err != nil {
			logger.Printf("warn: failed to authenticate SMTP client: %v", err)
			return
		}
		if err := client.Mail(fromAddr); err != nil {
			logger.Printf("warn: failed to set SMTP sender: %v", err)
			return
		}
		if err := client.Rcpt(recipient); err != nil {
			logger.Printf("warn: failed to set SMTP recipient: %v", err)
			return
		}
		wc, err := client.Data()
		if err != nil {
			logger.Printf("warn: failed to open SMTP data writer: %v", err)
			return
		}
		if _, err := wc.Write(msg); err != nil {
			logger.Printf("warn: failed to write SMTP message: %v", err)
			_ = wc.Close()
			return
		}
		if err := wc.Close(); err != nil {
			logger.Printf("warn: failed to close SMTP data writer: %v", err)
			return
		}
		if err := client.Quit(); err != nil {
			logger.Printf("warn: failed to quit SMTP session: %v", err)
		}
	}(recipient)
	return nil
}

/* ============================================================
   3. REPOSITORIES (DATA ACCESS / STORAGE LAYER)
============================================================ */

func SaveOTPCache(ctx context.Context, app *infra.Deps, email, hashedOTP string) error {
	key := "otp:" + email
	return app.Cache.SetWithExpiry(ctx, key, []byte(hashedOTP), OTPExpiry)
}

func GetOTPCache(ctx context.Context, app *infra.Deps, email string) ([]byte, error) {
	key := "otp:" + email
	return app.Cache.Get(ctx, key)
}

func DeleteOTPCache(ctx context.Context, app *infra.Deps, email string) error {
	key := "otp:" + email
	return app.Cache.Del(ctx, key)
}

func UpdateUserVerificationStatus(ctx context.Context, app *infra.Deps, email string) error {
	return VerifyUserEmail(ctx, app, email)
}
