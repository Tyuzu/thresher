package mqevent

import "time"

/* ============================================================
   MEDIA EVENTS
============================================================ */

const (
	MediaUploadedEvent = "media.uploaded"
	MediaUpdatedEvent  = "media.updated"
	MediaRemovedEvent  = "media.removed"
)

/* ============================================================
   MEDIA UPLOADED
============================================================ */

type MediaUploadedPayload struct {
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	FilePath   string    `json:"file_path"`
	Extension  string    `json:"extension"`
	FileName   string    `json:"file_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MEDIA UPDATED
============================================================ */

type MediaUpdatedPayload struct {
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	FilePath   string    `json:"file_path"`
	Extension  string    `json:"extension"`
	FileName   string    `json:"file_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MEDIA REMOVED
============================================================ */

type MediaRemovedPayload struct {
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	FilePath   string    `json:"file_path,omitempty"`
	FileName   string    `json:"file_name,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
