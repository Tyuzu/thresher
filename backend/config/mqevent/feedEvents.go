package mqevent

import "time"

/* ============================================================
   FEED POST EVENTS
============================================================ */

const (
	FeedPostCreatedEvent = "feedpost.created"
	FeedPostUpdatedEvent = "feedpost.updated"
	FeedPostDeletedEvent = "feedpost.deleted"
)

/* ============================================================
   FEED POST CREATED
============================================================ */

type FeedPostCreatedPayload struct {
	FeedPostID string    `json:"feed_post_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FEED POST UPDATED
============================================================ */

type FeedPostUpdatedPayload struct {
	FeedPostID string    `json:"feed_post_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FEED POST DELETED
============================================================ */

type FeedPostDeletedPayload struct {
	FeedPostID string    `json:"feed_post_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
