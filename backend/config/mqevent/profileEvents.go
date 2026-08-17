package mqevent

import "time"

/* ============================================================
   PROFILE EVENTS
============================================================ */

const (
	ProfileCreatedEvent = "profile.created"
	ProfileUpdatedEvent = "profile.updated"
	ProfileDeletedEvent = "profile.deleted"
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
   PROFILE DELETED
============================================================ */

type ProfileDeletedPayload struct {
	ProfileID  string    `json:"profile_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
