package mqevent

import "time"

/* ============================================================
   PROFILE EVENTS
============================================================ */

const (
	ProfileCreated = "profile.created"
	ProfileUpdated = "profile.updated"
	ProfileRemoved = "profile.removed"
)

type ProfileCreatedPayload struct {
	ProfileID  string    `json:"profileid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ProfileUpdatedPayload struct {
	ProfileID  string    `json:"profileid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ProfileDeletedPayload struct {
	ProfileID  string    `json:"profileid"`
	OccurredAt time.Time `json:"occurred_at"`
}
