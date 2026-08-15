package mqevent

import "time"

/* ============================================================
   SOCIAL EVENTS
============================================================ */

const (
	UserFollowedEvent          = "user.followed"
	UserLikedEvent             = "post.liked"
	UserLikesBatchFlushedEvent = "likes.batch.flushed"
)

/* ============================================================
   NOTIFICATION EVENTS
============================================================ */

const (
	NotificationCreatedEvent            = "notification.created"
	NotificationsBulkCreatedEvent       = "notifications.bulk.created"
	NotificationReadEvent               = "notification.read"
	NotificationsAllReadEvent           = "notifications.all.read"
	NotificationDeletedEvent            = "notification.deleted"
	NotificationsAllClearedEvent        = "notifications.all.cleared"
	NotificationPreferencesUpdatedEvent = "notification.preferences.updated"
)

/* ============================================================
   USER FOLLOWED
============================================================ */

type UserFollowedPayload struct {
	UserID       string    `json:"user_id"`
	TargetUserID string    `json:"target_user_id"`
	OccurredAt   time.Time `json:"occurred_at"`
}

/* ============================================================
   USER LIKED
============================================================ */

type UserLikedPayload struct {
	UserID     string    `json:"user_id"`
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	CreatedAt  time.Time `json:"created_at"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   LIKES BATCH
============================================================ */

type UserLikesBatchFlushedPayload struct {
	UserID     string    `json:"user_id"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   NOTIFICATION CREATED
============================================================ */

type NotificationCreatedPayload struct {
	EventID        string    `json:"event_id"`
	NotificationID string    `json:"notification_id"`
	UserID         string    `json:"user_id"`
	Type           string    `json:"type"`
	Title          string    `json:"title"`
	Message        string    `json:"message"`
	EntityType     string    `json:"entity_type,omitempty"`
	EntityID       string    `json:"entity_id,omitempty"`
	RelatedUserID  string    `json:"related_user_id,omitempty"`
	OccurredAt     time.Time `json:"occurred_at"`
}

/* ============================================================
   BULK NOTIFICATIONS
============================================================ */

type NotificationsBulkCreatedPayload struct {
	Count      int       `json:"count"`
	UserIDs    []string  `json:"user_ids"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   NOTIFICATION READ
============================================================ */

type NotificationReadPayload struct {
	NotificationID string    `json:"notification_id"`
	UserID         string    `json:"user_id"`
	OccurredAt     time.Time `json:"occurred_at"`
}

type NotificationsAllReadPayload struct {
	UserID     string    `json:"user_id"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   NOTIFICATION DELETED
============================================================ */

type NotificationDeletedPayload struct {
	NotificationID string    `json:"notification_id"`
	UserID         string    `json:"user_id"`
	OccurredAt     time.Time `json:"occurred_at"`
}

type NotificationsAllClearedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   NOTIFICATION PREFERENCES
============================================================ */

type NotificationPreferencesUpdatedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
