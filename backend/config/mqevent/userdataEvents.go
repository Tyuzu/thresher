package mqevent

import "time"

/* ============================================================
   USER DATA EVENTS
============================================================ */

const (
	UserDataCreatedEvent = "userdata.created"
	UserDataUpdatedEvent = "userdata.updated"
	UserDataRemovedEvent = "userdata.removed"
)

/* ============================================================
   USER DATA CREATED
============================================================ */

type UserDataCreatedPayload struct {
	UserDataID string    `json:"user_data_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   USER DATA UPDATED
============================================================ */

type UserDataUpdatedPayload struct {
	UserDataID string    `json:"user_data_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   USER DATA REMOVED
============================================================ */

type UserDataRemovedPayload struct {
	UserDataID string    `json:"user_data_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
