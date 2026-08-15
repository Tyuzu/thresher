package mqevent

import "time"

/* ============================================================
   DELETION EVENTS
============================================================ */

const (
	HardDeletedEvent = "deleted.hard"
	SoftDeletedEvent = "deleted.soft"
)

/* ============================================================
   HARD DELETED
============================================================ */

type HardDeletedPayload struct {
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	DeletedBy  string    `json:"deleted_by,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   SOFT DELETED
============================================================ */

type SoftDeletedPayload struct {
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	DeletedBy  string    `json:"deleted_by,omitempty"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
