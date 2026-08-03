package mqevent

import "time"

/* ============================================================
   PROFILE EVENTS
============================================================ */

const (
	ProfileCreatedEvent = "profile.created"
	ProfileUpdatedEvent = "profile.updated"
	ProfileDeletedEvent = "profile.removed"
)

type ProfileCreatedPayload struct {
	ProfileID  string    `json:"profileid"`
	OccurredAt time.Time `json:"occurredat"`
}

type ProfileUpdatedPayload struct {
	ProfileID  string    `json:"profileid"`
	OccurredAt time.Time `json:"occurredat"`
}

type ProfileDeletedPayload struct {
	ProfileID  string    `json:"profileid"`
	OccurredAt time.Time `json:"occurredat"`
}
