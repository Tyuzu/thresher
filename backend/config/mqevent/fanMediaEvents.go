package mqevent

import "time"

/* ============================================================
   FANMEDIA EVENTS
============================================================ */

const (
	FanMediaCreated = "fanmedia.created"
	FanMediaUpdated = "fanmedia.updated"
	FanMediaRemoved = "fanmedia.removed"
)

type FanMediaCreatedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FanMediaUpdatedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FanMediaDeletedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	OccurredAt time.Time `json:"occurred_at"`
}
