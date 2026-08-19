// models.go
package notifications

import "time"

type Notification struct {
	NotificationID string    `json:"id" bson:"notificationid"`
	UserID         string    `json:"userid" bson:"userid"`
	Title          string    `json:"title" bson:"title"`
	Message        string    `json:"message" bson:"message"`
	Type           string    `json:"type" bson:"type"` // e.g., "system", "like", "comment"
	IsRead         bool      `json:"isRead" bson:"is_read"`
	CreatedAt      time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" bson:"updated_at"`
}

type NotificationPreferences struct {
	UserID      string    `json:"userid" bson:"userid"`
	EmailNotifs bool      `json:"emailNotifs" bson:"email_notifs"`
	PushNotifs  bool      `json:"pushNotifs" bson:"push_notifs"`
	InAppNotifs bool      `json:"inAppNotifs" bson:"in_app_notifs"`
	UpdatedAt   time.Time `json:"updatedAt" bson:"updated_at"`
}
