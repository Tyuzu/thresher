package mqevent

import "time"

/* ============================================================
   VLIVE EVENTS
============================================================ */

const (
	VliveCreated = "vlive.created"
	VliveUpdated = "vlive.updated"
	VliveRemoved = "vlive.removed"
)

type VliveCreatedPayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type VliveUpdatedPayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type VliveDeletedPayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurred_at"`
}
