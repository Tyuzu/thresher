package mqevent

import "time"

/* ============================================================
   NOTICES EVENTS
============================================================ */

const (
	NoticesCreatedEvent = "notices.created"
	NoticesUpdatedEvent = "notices.updated"
	NoticesRemovedEvent = "notices.removed"
)

type NoticesCreatedPayload struct {
	NoticesID  string    `json:"noticesid"`
	OccurredAt time.Time `json:"occurredat"`
}

type NoticesUpdatedPayload struct {
	NoticesID  string    `json:"noticesid"`
	OccurredAt time.Time `json:"occurredat"`
}

type NoticesDeletedPayload struct {
	NoticesID  string    `json:"noticesid"`
	OccurredAt time.Time `json:"occurredat"`
}
