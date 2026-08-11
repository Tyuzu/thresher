package auth

import "time"

type SignUpRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type SignUpResponse struct {
	Message string `json:"message"`
	UserID  string `json:"userid"`
}

const (
	AccessTokenTTL    = 15 * time.Minute
	maxFailedAttempts = 5
	lockoutDuration   = 15 * time.Minute
)

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
	UserID      string
	AccessToken string
	NewRefresh  string // non-empty => set this new refresh in cookie
	ClearCookie bool   // true => clear cookie on response
}

type User struct {
	// ID          string    `json:"-" bson:"_id,omitempty"`
	UserID       string    `json:"userid" bson:"userid"`
	Username     string    `json:"username" bson:"username"`
	Email        string    `json:"email" bson:"email"`
	Password     string    `json:"-" bson:"password"`
	PasswordHash string    `json:"password_hash" bson:"password_hash"`
	Role         []string  `json:"role" bson:"role"`
	Name         string    `json:"name,omitempty" bson:"name,omitempty"`
	CreatedAt    time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" bson:"updated_at"`
	Bio          string    `json:"bio,omitempty" bson:"bio,omitempty"`
	Online       bool      `json:"online"`
	LastLogin    time.Time `json:"last_login" bson:"last_login"`
	Avatar       string    `json:"avatar" bson:"avatar"`
	Banner       string    `json:"banner" bson:"banner"`
	ProfileViews int       `json:"profile_views,omitempty" bson:"profile_views,omitempty"`
	PhoneNumber  string    `json:"phone_number,omitempty" bson:"phone_number,omitempty"`
	Address      string    `json:"address,omitempty" bson:"address,omitempty"`
	// DateOfBirth    time.Time         `json:"dob" bson:"dob"`
	SocialLinks    map[string]string `json:"social_links,omitempty" bson:"social_links,omitempty"`
	IsVerified     bool              `json:"is_verified" bson:"is_verified"`
	EmailVerified  bool              `json:"email_verified" bson:"email_verified"`
	FollowersCount int               `json:"followerscount" bson:"followerscount"`
	FollowingCount int               `json:"followscount" bson:"followscount"`
	WalletBalance  float64           `bson:"wallet_balance" json:"wallet_balance"`
	RefreshToken   string            `json:"-" bson:"refresh_token,omitempty"`
	RefreshExpiry  time.Time         `json:"-" bson:"refresh_expiry,omitempty"`
	RefreshUA      string            `bson:"refresh_ua,omitempty"`
	RefreshIP      string            `bson:"refresh_ip,omitempty"`
	RefreshPrev    string            `bson:"refresh_prev,omitempty"`
}
