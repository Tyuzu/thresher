package mqevent

import "time"

/* ============================================================
   EVENT EVENTS
============================================================ */

const (
	EventCreatedEvent = "event.created"
	EventUpdatedEvent = "event.updated"
	EventRemovedEvent = "event.removed"
)

/* ============================================================
   EVENT CREATED
============================================================ */

type EventCreatedPayload struct {
	EventID    string    `json:"event_id"`
	CreatorID  string    `json:"creator_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   EVENT UPDATED
============================================================ */

type EventUpdatedPayload struct {
	EventID    string    `json:"event_id"`
	UpdatedBy  string    `json:"updated_by"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   EVENT REMOVED
============================================================ */

type EventRemovedPayload struct {
	EventID    string    `json:"event_id"`
	RemovedBy  string    `json:"removed_by"`
	OccurredAt time.Time `json:"occurred_at"`
}
