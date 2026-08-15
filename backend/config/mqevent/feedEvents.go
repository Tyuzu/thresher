package mqevent

import "time"

/* ============================================================
   FEED POST EVENTS
============================================================ */

const (
	FeedPostCreatedEvent = "feedpost.created"
	FeedPostUpdatedEvent = "feedpost.updated"
	FeedPostRemovedEvent = "feedpost.removed"
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
   FEED POST REMOVED
============================================================ */

type FeedPostRemovedPayload struct {
	FeedPostID string    `json:"feed_post_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
