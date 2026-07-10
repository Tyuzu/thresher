package mqevent

import "time"

/* ============================================================
   FEEDPOST EVENTS
============================================================ */

const (
	FeedPostCreated = "feedpost.created"
	FeedPostUpdated = "feedpost.updated"
	FeedPostRemoved = "feedpost.removed"
)

type FeedPostCreatedPayload struct {
	FeedPostID string    `json:"feedpostid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FeedPostUpdatedPayload struct {
	FeedPostID string    `json:"feedpostid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FeedPostDeletedPayload struct {
	FeedPostID string    `json:"feedpostid"`
	OccurredAt time.Time `json:"occurred_at"`
}
