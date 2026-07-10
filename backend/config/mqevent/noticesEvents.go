package mqevent

import "time"

/* ============================================================
   NOTICES EVENTS
============================================================ */

const (
	NoticesCreated = "notices.created"
	NoticesUpdated = "notices.updated"
	NoticesRemoved = "notices.removed"
)

type NoticesCreatedPayload struct {
	NoticesID  string    `json:"noticesid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type NoticesUpdatedPayload struct {
	NoticesID  string    `json:"noticesid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type NoticesDeletedPayload struct {
	NoticesID  string    `json:"noticesid"`
	OccurredAt time.Time `json:"occurred_at"`
}
