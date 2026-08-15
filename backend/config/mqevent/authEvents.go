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

	TokenRefreshed = "auth.token.refreshed"
)

/* ============================================================
   USER REGISTERED
============================================================ */

type UserRegisteredPayload struct {
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   USER LOGIN
============================================================ */

type UserLoggedInPayload struct {
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   USER LOGOUT
============================================================ */

type UserLoggedOutPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserLoggedOutAllSessionsPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PASSWORD RESET
============================================================ */

type PasswordResetRequestedPayload struct {
	UserID     string    `json:"user_id"`
	Email      string    `json:"email"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PasswordResetCompletedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   OTP
============================================================ */

type OTPRequestedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OTPVerifiedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   TOKEN REFRESH
============================================================ */

type TokenRefreshedPayload struct {
	UserID     string    `json:"user_id"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	OccurredAt time.Time `json:"occurred_at"`
}
