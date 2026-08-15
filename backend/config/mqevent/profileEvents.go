package mqevent

import "time"

/* ============================================================
   PROFILE EVENTS
============================================================ */

const (
	ProfileCreatedEvent = "profile.created"
	ProfileUpdatedEvent = "profile.updated"
	ProfileRemovedEvent = "profile.removed"
)

/* ============================================================
   PROFILE CREATED
============================================================ */

type ProfileCreatedPayload struct {
	ProfileID  string    `json:"profile_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PROFILE UPDATED
============================================================ */

type ProfileUpdatedPayload struct {
	ProfileID  string    `json:"profile_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PROFILE REMOVED
============================================================ */

type ProfileRemovedPayload struct {
	ProfileID  string    `json:"profile_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
