package models

import "time"

type User struct {
	// ID          string    `json:"-" bson:"_id,omitempty"`
	UserID       string    `json:"userid" bson:"userid"`
	Username     string    `json:"username" bson:"username"`
	Email        string    `json:"email" bson:"email"`
	Password     string    `json:"-" bson:"password"`
	PasswordHash string    `json:"passwordhash" bson:"passwordhash"`
	Role         []string  `json:"role" bson:"role"`
	Name         string    `json:"name,omitempty" bson:"name,omitempty"`
	CreatedAt    time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt    time.Time `json:"updatedat" bson:"updatedat"`
	Bio          string    `json:"bio,omitempty" bson:"bio,omitempty"`
	Online       bool      `json:"online"`
	LastLogin    time.Time `json:"lastlogin" bson:"lastlogin"`
	Avatar       string    `json:"avatar" bson:"avatar"`
	Banner       string    `json:"banner" bson:"banner"`
	ProfileViews int       `json:"profileviews,omitempty" bson:"profileviews,omitempty"`
	PhoneNumber  string    `json:"phonenumber,omitempty" bson:"phonenumber,omitempty"`
	Address      string    `json:"address,omitempty" bson:"address,omitempty"`
	// DateOfBirth    time.Time         `json:"dob" bson:"dob"`
	SocialLinks    map[string]string `json:"sociallinks,omitempty" bson:"sociallinks,omitempty"`
	IsVerified     bool              `json:"isverified" bson:"isverified"`
	EmailVerified  bool              `json:"emailverified" bson:"emailverified"`
	FollowersCount int               `json:"followerscount" bson:"followerscount"`
	FollowingCount int               `json:"followscount" bson:"followscount"`
	WalletBalance  float64           `bson:"walletbalance" json:"walletbalance"`
	RefreshToken   string            `json:"-" bson:"refresh_token,omitempty"`
	RefreshExpiry  time.Time         `json:"-" bson:"refresh_expiry,omitempty"`
	RefreshUA      string            `bson:"refreshua,omitempty"`
	RefreshIP      string            `bson:"refreship,omitempty"`
	RefreshPrev    string            `bson:"refreshprev,omitempty"`
	// Vendor fields
	IsVendor      bool           `json:"isvendor" bson:"isvendor"`
	VendorProfile *VendorProfile `json:"vendorprofile,omitempty" bson:"vendorprofile,omitempty"`
}

// VendorProfile contains vendor-specific information for a user
type VendorProfile struct {
	VendorID    string   `json:"vendorid" bson:"vendorid"`
	Category    string   `json:"category" bson:"category"`
	Description string   `json:"description,omitempty" bson:"description,omitempty"`
	Rating      float64  `json:"rating" bson:"rating"`
	RatingCount int      `json:"ratingcount" bson:"ratingcount"`
	Portfolio   []string `json:"portfolio,omitempty" bson:"portfolio,omitempty"`
	Verified    bool     `json:"verified" bson:"verified"`
}

// UserProfileResponse defines the structure for the user profile response
type UserProfileResponse struct {
	UserID         string            `json:"userid" bson:"userid"`
	Username       string            `json:"username" bson:"username"`
	Name           string            `json:"name" bson:"name"`
	Email          string            `json:"email" bson:"email"`
	Bio            string            `json:"bio,omitempty" bson:"bio,omitempty"`
	PhoneNumber    string            `json:"phonenumber,omitempty" bson:"phonenumber,omitempty"`
	Avatar         string            `json:"avatar" bson:"avatar"`
	Banner         string            `json:"banner" bson:"banner"`
	IsFollowing    bool              `json:"isfollowing" bson:"isfollowing"` // Added here
	FollowersCount int               `json:"followerscount" bson:"followerscount"`
	FollowingCount int               `json:"followscount" bson:"followscount"`
	SocialLinks    map[string]string `json:"sociallinks,omitempty" bson:"sociallinks,omitempty"`
	Online         bool              `json:"online,omitempty"`
	LastLogin      time.Time         `json:"lastlogin" bson:"lastlogin"`
}

type UserFollow struct {
	UserID    string   `json:"userid" bson:"userid"`
	Follows   []string `json:"follows,omitempty" bson:"follows,omitempty"`
	Followers []string `json:"followers,omitempty" bson:"followers,omitempty"`
}

type UserSubscribe struct {
	UserID      string   `json:"userid" bson:"userid"`
	Subscribed  []string `json:"subscribed,omitempty" bson:"subscribed,omitempty"`   // users this user is subscribed to
	Subscribers []string `json:"subscribers,omitempty" bson:"subscribers,omitempty"` // users who subscribed to this user
}

type UserData struct {
	UserID     string `json:"userid" bson:"userid"`
	EntityID   string `json:"entity_id" bson:"entity_id"`
	EntityType string `json:"entity_type" bson:"entity_type"`
	ItemID     string `json:"item_id" bson:"item_id"`
	ItemType   string `json:"item_type" bson:"item_type"`
	CreatedAt  string `json:"created_at" bson:"created_at"`
}
