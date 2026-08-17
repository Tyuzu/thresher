package mqevent

import "time"

/* ============================================================
   REVIEW EVENTS
============================================================ */

const (
	ReviewCreatedEvent = "review.created"
	ReviewUpdatedEvent = "review.updated"
	ReviewDeletedEvent = "review.deleted"
)

/* ============================================================
   REVIEW CREATED
============================================================ */

type ReviewCreatedPayload struct {
	ReviewID   string    `json:"review_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   REVIEW UPDATED
============================================================ */

type ReviewUpdatedPayload struct {
	ReviewID   string    `json:"review_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   REVIEW DELETED
============================================================ */

type ReviewDeletedPayload struct {
	ReviewID   string    `json:"review_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
