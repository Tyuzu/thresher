package mqevent

import "time"

/* ============================================================
   MEDIA EVENTS
============================================================ */

const (
	MediaUploadedEvent = "media.uploaded"
	MediaUpdatedEvent  = "media.updated"
	MediaDeletedEvent  = "media.deleted"
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
   MEDIA DELETED
============================================================ */

type MediaDeletedPayload struct {
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	FilePath   string    `json:"file_path,omitempty"`
	FileName   string    `json:"file_name,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
