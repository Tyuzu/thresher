package mqevent

import "time"

/* ============================================================
   REVIEW EVENTS
============================================================ */

const (
	ReviewCreated = "review.created"
	ReviewUpdated = "review.updated"
	ReviewRemoved = "review.removed"
)

type ReviewCreatedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReviewUpdatedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReviewDeletedPayload struct {
	ReviewID   string    `json:"reviewid"`
	OccurredAt time.Time `json:"occurred_at"`
}
