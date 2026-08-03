package mqevent

import "time"

/* ============================================================
   AUTH EVENTS
============================================================ */

const (
	UserRegistered           = "auth.user.registered"
	UserLoggedIn             = "auth.user.loggedin"
	UserLoggedOut            = "auth.user.loggedout"
	UserLoggedOutAllSessions = "auth.user.loggedoutallsessions"

	PasswordResetRequested = "auth.passwordreset.requested"
	PasswordResetCompleted = "auth.passwordreset.completed"

	OTPRequested = "auth.otp.requested"
	OTPVerified  = "auth.otp.verified"

	TokenRefreshed = "auth.tokenrefreshed"
)

/* ============================================================
   AUTH PAYLOADS
============================================================ */

type UserRegisteredPayload struct {
	UserID    string    `json:"userid"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdat"`
}

type UserLoggedInPayload struct {
	UserID     string    `json:"userid"`
	Username   string    `json:"username"`
	OccurredAt time.Time `json:"occurredat"`
	IP         string    `json:"ip"`
}

type UserLoggedOutPayload struct {
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type UserOTPPayload struct {
	UserID     string    `json:"userid"`
	OTP        string    `json:"otp"`
	OccurredAt time.Time `json:"occurredat"`
}

type TokenRefreshPayload struct {
	UserID     string    `json:"userid"`
	OTP        string    `json:"otp"`
	OccurredAt time.Time `json:"occurredat"`
}
