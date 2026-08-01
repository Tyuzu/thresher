package authnew

import (
	"encoding/json"
	"net/http"

	"naevis/infra"
)

// Helper to write JSON responses
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

// Helper to handle JSON decoding
func decodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON body"})
		return err
	}
	return nil
}

func Register(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RegisterRequest
		if err := decodeJSON(w, r, &req); err != nil {
			return
		}

		if req.Email == "" || req.Password == "" {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Email and password are required"})
			return
		}

		respondJSON(w, http.StatusCreated, RegisterResponse{
			Message: "User registered successfully",
		})
	}
}

func Login(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := decodeJSON(w, r, &req); err != nil {
			return
		}

		if (req.Username == "" && req.Email == "") || req.Password == "" {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing credentials"})
			return
		}

		respondJSON(w, http.StatusOK, LoginResponse{
			Message:      "Login successful",
			AccessToken:  "mock-access-token",
			RefreshToken: "mock-refresh-token",
		})
	}
}

func RefreshToken(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RefreshTokenRequest
		if err := decodeJSON(w, r, &req); err != nil {
			return
		}

		if req.RefreshToken == "" {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Refresh token required"})
			return
		}

		respondJSON(w, http.StatusOK, RefreshTokenResponse{
			AccessToken: "mock-new-access-token",
		})
	}
}

func LogoutUser(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LogoutRequest
		_ = decodeJSON(w, r, &req)

		respondJSON(w, http.StatusOK, LogoutResponse{
			Message: "Logged out successfully",
		})
	}
}

func LogoutAllSessions(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, LogoutResponse{
			Message: "Logged out from all sessions",
		})
	}
}

func RequestOTPHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req OTPRequestRequest
		if err := decodeJSON(w, r, &req); err != nil {
			return
		}

		if req.Email == "" {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Email is required"})
			return
		}

		respondJSON(w, http.StatusOK, OTPRequestResponse{
			Message: "OTP sent successfully",
		})
	}
}

func VerifyOTPHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req OTPVerifyRequest
		if err := decodeJSON(w, r, &req); err != nil {
			return
		}

		if req.Email == "" || req.OTP == "" {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Email and OTP are required"})
			return
		}

		respondJSON(w, http.StatusOK, OTPVerifyResponse{
			Message:     "OTP verified successfully",
			AccessToken: "mock-access-token-after-otp",
		})
	}
}
