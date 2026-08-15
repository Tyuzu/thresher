package mqevent

import "time"

/* ============================================================
   MUSICON EVENTS
============================================================ */

const (
	MusiconCreatedEvent = "musicon.created"
	MusiconUpdatedEvent = "musicon.updated"
	MusiconRemovedEvent = "musicon.removed"
)

/* ============================================================
   MUSICON CREATED
============================================================ */

type MusiconCreatedPayload struct {
	MusiconID  string    `json:"musicon_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MUSICON UPDATED
============================================================ */

type MusiconUpdatedPayload struct {
	MusiconID  string    `json:"musicon_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MUSICON REMOVED
============================================================ */

type MusiconRemovedPayload struct {
	MusiconID  string    `json:"musicon_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
