package mqevent

import "time"

/* ============================================================
   FANMEDIA EVENTS
============================================================ */

const (
	FanMediaCreatedEvent = "fanmedia.created"
	FanMediaUpdatedEvent = "fanmedia.updated"
	FanMediaRemovedEvent = "event.removed"
)

type FanMediaCreatedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FanMediaUpdatedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FanMediaRemovedPayload struct {
	EventID    string    `json:"eventid"`
	OccurredAt time.Time `json:"occurred_at"`
}
