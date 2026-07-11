package mqevent

import "time"

/* ============================================================
   REVIEW EVENTS
============================================================ */

const (
	UserSettingsUpdatedEvent   = "review.created"
	UserSettingsResetEvent     = "review.updated"
	UserSettingsInitiatedEvent = "review.removed"
)

type UserSettingsUpdatedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserSettingsResetPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserSettingsInitiatedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurred_at"`
}
