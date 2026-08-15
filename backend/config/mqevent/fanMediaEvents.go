package mqevent

import "time"

/* ============================================================
   FAN MEDIA EVENTS
============================================================ */

const (
	FanMediaCreatedEvent = "fanmedia.created"
	FanMediaUpdatedEvent = "fanmedia.updated"
	FanMediaRemovedEvent = "fanmedia.removed"
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
   FAN MEDIA REMOVED
============================================================ */

type FanMediaRemovedPayload struct {
	FanMediaID string    `json:"fan_media_id"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	RemovedBy  string    `json:"removed_by"`
	OccurredAt time.Time `json:"occurred_at"`
}
