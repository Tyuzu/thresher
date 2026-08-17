package mqevent

import "time"

/* ============================================================
   EVENT EVENTS
============================================================ */

const (
	EventCreatedEvent = "event.created"
	EventUpdatedEvent = "event.updated"
	EventDeletedEvent = "event.deleted"
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
   EVENT DELETED
============================================================ */

type EventDeletedPayload struct {
	EventID    string    `json:"event_id"`
	DeletedBy  string    `json:"deleted_by"`
	OccurredAt time.Time `json:"occurred_at"`
}
