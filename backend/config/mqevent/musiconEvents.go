package mqevent

import "time"

/* ============================================================
   MUSICON EVENTS
============================================================ */

const (
	MusiconCreatedEvent = "musicon.created"
	MusiconUpdatedEvent = "musicon.updated"
	MusiconDeletedEvent = "musicon.deleted"
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
   MUSICON DELETED
============================================================ */

type MusiconDeletedPayload struct {
	MusiconID  string    `json:"musicon_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
