package mqevent

import "time"

/* ============================================================
   MUSICON EVENTS
============================================================ */

const (
	MusiconCreated = "musicon.created"
	MusiconUpdated = "musicon.updated"
	MusiconRemoved = "musicon.removed"
)

type MusiconCreatedPayload struct {
	MusiconID  string    `json:"musiconid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MusiconUpdatedPayload struct {
	MusiconID  string    `json:"musiconid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MusiconDeletedPayload struct {
	MusiconID  string    `json:"musiconid"`
	OccurredAt time.Time `json:"occurred_at"`
}
