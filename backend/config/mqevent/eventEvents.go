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

type EventCreatedPayload struct {
	EventID    string    `json:"eventid"`
	CreatorID  string    `json:"creatorid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type EventUpdatedPayload struct {
	EventID    string    `json:"eventid"`
	UpdatedBy  string    `json:"updatedby"`
	OccurredAt time.Time `json:"occurred_at"`
}

type EventDeletedPayload struct {
	EventID    string    `json:"eventid"`
	DeletedBy  string    `json:"deletedby"`
	OccurredAt time.Time `json:"occurred_at"`
}
