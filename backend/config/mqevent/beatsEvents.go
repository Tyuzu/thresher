package mqevent

import "time"

const (
	UserFollowedEvent                   = "user.followed"
	UserLikedEvent                      = "post.liked"
	UserLikesBatchFlushedEvent          = "likes.batch.flushed"
	OneNotificationCreatedEvent         = "notification.created"
	BulkNotificationsCreatedEvent       = "notifications.bulk.created"
	OneNotificationReadEvent            = "notification.read"
	AllNotificationsReadEvent           = "notifications.all.read"
	NotificationDeletedEvent            = "notification.deleted"
	AllNotificationsClearedEvent        = "notifications.all.cleared"
	NotificationPreferencesUpdatedEvent = "notification.preferences.updated"
)

type UserFollowedPayload struct {
	UserID       string    `json:"userid"`
	TargetUserID string    `json:"target_userid"`
	OccurredAt   time.Time `json:"occurred_at"`
}

type UserLikedPayload struct {
	UserID     string    `json:"userid"`
	TargetID   string    `json:"targetid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserLikesBatchFlushedPayload struct {
	UserID     string    `json:"userid"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OneNotificationCreatedPayload struct {
	NotificationID string    `json:"notificationid"`
	UserID         string    `json:"userid"`
	Type           string    `json:"type"`
	Title          string    `json:"title"`
	Message        string    `json:"message"`
	EntityType     string    `json:"entitytype,omitempty"`
	EntityID       string    `json:"entityid,omitempty"`
	RelatedUser    string    `json:"relateduser,omitempty"`
	OccurredAt     time.Time `json:"occurred_at"`
}

type BulkNotificationsCreatedPayload struct {
	Count      int       `json:"count"`
	UserIDs    []string  `json:"userids"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OneNotificationReadPayload struct {
	NotificationID string    `json:"notificationid"`
	UserID         string    `json:"userid"`
	OccurredAt     time.Time `json:"occurred_at"`
}

type AllNotificationsReadPayload struct {
	UserID     string    `json:"userid"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurred_at"`
}

type NotificationDeletedPayload struct {
	NotificationID string    `json:"notificationid"`
	UserID         string    `json:"userid"`
	OccurredAt     time.Time `json:"occurred_at"`
}

type AllNotificationsClearedPayload struct {
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type NotificationPreferencesUpdatedPayload struct {
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}
