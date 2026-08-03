package models

import (
	"time"
)

// Notification represents a user-level notification
type Notification struct {
	ID          string    `bson:"_id,omitempty" json:"id"`
	UserID      string    `bson:"userid" json:"userid"`
	Type        string    `bson:"type" json:"type"`               // notification type: mention, follow, comment, like, etc.
	Title       string    `bson:"title" json:"title"`             // notification title
	Message     string    `bson:"message" json:"message"`         // notification message/content
	EntityType  string    `bson:"entitytype" json:"entitytype"`   // type of entity this notification is about
	EntityID    string    `bson:"entityid" json:"entityid"`       // ID of the entity
	RelatedUser string    `bson:"relateduser" json:"relateduser"` // user who triggered this notification
	IsRead      bool      `bson:"isread" json:"isread"`           // read status
	CreatedAt   time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt   time.Time `bson:"updatedat" json:"updatedat"`
}

// NotificationPreference stores notification settings per user
type NotificationPreference struct {
	ID              string    `bson:"_id,omitempty" json:"id"`
	UserID          string    `bson:"userId" json:"userId"`
	MentionsEnabled bool      `bson:"mentionsenabled" json:"mentionsenabled"`
	FollowsEnabled  bool      `bson:"followsenabled" json:"followsenabled"`
	CommentsEnabled bool      `bson:"commentsenabled" json:"commentsenabled"`
	LikesEnabled    bool      `bson:"likesenabled" json:"likesenabled"`
	MessagesEnabled bool      `bson:"messagesenabled" json:"messagesenabled"`
	AllEnabled      bool      `bson:"allenabled" json:"allenabled"`
	CreatedAt       time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time `bson:"updatedAt" json:"updatedAt"`
}
