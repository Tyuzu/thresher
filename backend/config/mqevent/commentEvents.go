package mqevent

import "time"

/* ============================================================
   COMMENT EVENTS
============================================================ */

const (
	CommentCreatedEvent = "comment.created"
	CommentUpdatedEvent = "comment.updated"
	CommentRemovedEvent = "comment.removed"
)

type CommentCreatedPayload struct {
	CommentID  string    `json:"commentid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CommentUpdatedPayload struct {
	CommentID  string    `json:"commentid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CommentDeletedPayload struct {
	CommentID  string    `json:"commentid"`
	OccurredAt time.Time `json:"occurred_at"`
}
