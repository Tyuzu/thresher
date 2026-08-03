package mqevent

import "time"

/* ============================================================
   FEEDPOST EVENTS
============================================================ */

const (
	FeedPostCreatedEvent = "feedpost.created"
	FeedPostUpdatedEvent = "feedpost.updated"
	FeedPostRemovedEvent = "feedpost.removed"
)

type FeedPostCreatedPayload struct {
	FeedPostID string    `json:"feedpostid"`
	OccurredAt time.Time `json:"occurredat"`
}

type FeedPostUpdatedPayload struct {
	FeedPostID string    `json:"feedpostid"`
	OccurredAt time.Time `json:"occurredat"`
}

type FeedPostDeletedPayload struct {
	FeedPostID string    `json:"feedpostid"`
	OccurredAt time.Time `json:"occurredat"`
}
