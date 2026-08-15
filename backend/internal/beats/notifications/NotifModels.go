package notifications

import "time"

// UpdatePreferencesRequest defines incoming payloads.
type UpdatePreferencesRequest struct {
	MentionsEnabled *bool `json:"mentionsenabled"`
	FollowsEnabled  *bool `json:"followsenabled"`
	CommentsEnabled *bool `json:"commentsenabled"`
	LikesEnabled    *bool `json:"likesenabled"`
	MessagesEnabled *bool `json:"messagesenabled"`
	AllEnabled      *bool `json:"allenabled"`
}

// CreateRequest represents the incoming request payload for a single notification.
type CreateRequest struct {
	UserID      string `json:"userid"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	EntityType  string `json:"entitytype"`
	EntityID    string `json:"entityid"`
	RelatedUser string `json:"relateduser"`
}

// Notification represents a user-level notification.
// Note: Fixed BSON tags to match query keys (userId, isRead, etc.)
type Notification struct {
	ID          string    `bson:"_id,omitempty" json:"id"`
	UserID      string    `bson:"userId" json:"userId"`
	Type        string    `bson:"type" json:"type"`
	Title       string    `bson:"title" json:"title"`
	Message     string    `bson:"message" json:"message"`
	EntityType  string    `bson:"entityType" json:"entityType"`
	EntityID    string    `bson:"entityId" json:"entityId"`
	RelatedUser string    `bson:"relatedUser" json:"relatedUser"`
	IsRead      bool      `bson:"isRead" json:"isRead"`
	CreatedAt   time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time `bson:"updatedAt" json:"updatedAt"`
}

// NotificationPreference stores notification settings per user.
type NotificationPreference struct {
	ID              string    `bson:"_id,omitempty" json:"id"`
	UserID          string    `bson:"userId" json:"userId"`
	MentionsEnabled bool      `bson:"mentionsEnabled" json:"mentionsEnabled"`
	FollowsEnabled  bool      `bson:"followsEnabled" json:"followsEnabled"`
	CommentsEnabled bool      `bson:"commentsEnabled" json:"commentsEnabled"`
	LikesEnabled    bool      `bson:"likesEnabled" json:"likesEnabled"`
	MessagesEnabled bool      `bson:"messagesEnabled" json:"messagesEnabled"`
	AllEnabled      bool      `bson:"allEnabled" json:"allEnabled"`
	CreatedAt       time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time `bson:"updatedAt" json:"updatedAt"`
}
