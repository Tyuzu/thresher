package mqevent

import "time"

/* ============================================================
   USER DATA EVENTS
============================================================ */

const (
	UserDataCreatedEvent = "userdata.created"
	UserDataUpdatedEvent = "userdata.updated"
	UserDataDeletedEvent = "userdata.deleted"
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
   USER DATA DELETED
============================================================ */

type UserDataDeletedPayload struct {
	UserDataID string    `json:"user_data_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
