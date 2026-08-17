package mqevent

import "time"

/* ============================================================
   FAN MEDIA EVENTS
============================================================ */

const (
	FanMediaCreatedEvent = "fanmedia.created"
	FanMediaUpdatedEvent = "fanmedia.updated"
	FanMediaDeletedEvent = "fanmedia.deleted"
)

/* ============================================================
   FAN MEDIA CREATED
============================================================ */

type FanMediaCreatedPayload struct {
	FanMediaID string    `json:"fan_media_id"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	CreatorID  string    `json:"creator_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FAN MEDIA UPDATED
============================================================ */

type FanMediaUpdatedPayload struct {
	FanMediaID string    `json:"fan_media_id"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	UpdatedBy  string    `json:"updated_by"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FAN MEDIA DELETED
============================================================ */

type FanMediaDeletedPayload struct {
	FanMediaID string    `json:"fan_media_id"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	DeletedBy  string    `json:"deleted_by"`
	OccurredAt time.Time `json:"occurred_at"`
}
