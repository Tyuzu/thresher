package mqevent

import "time"

/* ============================================================
   AUTH EVENTS
============================================================ */

const (
	UserRegistered           = "auth.user.registered"
	UserLoggedIn             = "auth.user.logged_in"
	UserLoggedOut            = "auth.user.logged_out"
	UserLoggedOutAllSessions = "auth.user.logged_out_all_sessions"

	PasswordResetRequested = "auth.password_reset.requested"
	PasswordResetCompleted = "auth.password_reset.completed"

	OTPRequested = "auth.otp.requested"
	OTPVerified  = "auth.otp.verified"

	TokenRefreshed = "auth.token_refreshed"
)

/* ============================================================
   AUTH PAYLOADS
============================================================ */

type UserRegisteredPayload struct {
	UserID     string    `json:"userid"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	OccurredAt time.Time `json:"occured_at"`
}

type UserLoggedInPayload struct {
	UserID     string    `json:"userid"`
	Username   string    `json:"username"`
	OccurredAt time.Time `json:"occurred_at"`
	IP         string    `json:"ip"`
}

type UserLoggedOutPayload struct {
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserOTPPayload struct {
	UserID     string    `json:"userid"`
	OTP        string    `json:"otp"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TokenRefreshPayload struct {
	UserAgent  string
	IPAddress  string
	UserID     string    `json:"userid"`
	OTP        string    `json:"otp"`
	OccurredAt time.Time `json:"occurred_at"`
}
