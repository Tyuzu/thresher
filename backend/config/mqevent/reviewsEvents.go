package mqevent

import "time"

/* ============================================================
   REVIEW EVENTS
============================================================ */

const (
	ReviewCreatedEvent = "review.created"
	ReviewUpdatedEvent = "review.updated"
	ReviewDeletedEvent = "review.removed"
)

type ReviewCreatedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurredat"`
}

type ReviewUpdatedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurredat"`
}

type ReviewDeletedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurredat"`
}
