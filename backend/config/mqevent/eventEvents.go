package mqevent

import "time"

/* ============================================================
   EVENT EVENTS
============================================================ */

const (
	EventCreated = "event.created"
	EventUpdated = "event.updated"
	EventRemoved = "event.removed"
)

type EventCreatedPayload struct {
	EventID    string    `json:"eventid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type EventUpdatedPayload struct {
	EventID    string    `json:"eventid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type EventDeletedPayload struct {
	EventID    string    `json:"eventid"`
	OccurredAt time.Time `json:"occurred_at"`
}
