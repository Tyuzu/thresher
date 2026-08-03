package auth

type SignUpRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type SignUpResponse struct {
	Message string `json:"message"`
	UserID  string `json:"userid"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Message string `json:"message"`
	Status  int    `json:"status"`
	Token   string `json:"token"`
	UserID  string `json:"userid"`
}

// Structural Data Transfers
type RequestOTPInput struct {
	Email string `json:"email"`
}

type VerifyOTPInput struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

// RefreshResult communicates intended cookie side-effects and tokens.
type RefreshResult struct {
	AccessToken string
	NewRefresh  string // non-empty => set this new refresh in cookie
	ClearCookie bool   // true => clear cookie on response
}
