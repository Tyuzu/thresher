package mqevent

import "time"

/* ============================================================
   USERDATA EVENTS
============================================================ */

const (
	UserdataCreated = "userdata.created"
	UserdataUpdated = "userdata.updated"
	UserdataRemoved = "userdata.removed"
)

type UserdataCreatedPayload struct {
	UserdataID string    `json:"userdataid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserdataUpdatedPayload struct {
	UserdataID string    `json:"userdataid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type UserdataDeletedPayload struct {
	UserdataID string    `json:"userdataid"`
	OccurredAt time.Time `json:"occurred_at"`
}
