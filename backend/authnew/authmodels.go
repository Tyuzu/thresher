package authnew

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterResponse struct {
	Message string `json:"message"`
}

type LoginRequest struct {
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Message      string `json:"message"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token,omitempty"`
}

type LogoutResponse struct {
	Message string `json:"message"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type OTPRequestRequest struct {
	Email string `json:"email"`
}

type OTPRequestResponse struct {
	Message string `json:"message"`
}

type OTPVerifyRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

type OTPVerifyResponse struct {
	Message     string `json:"message"`
	AccessToken string `json:"access_token,omitempty"`
}
