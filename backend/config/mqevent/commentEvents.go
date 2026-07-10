package mqevent

import "time"

/* ============================================================
   COMMENT EVENTS
============================================================ */

const (
	CommentCreated = "comment.created"
	CommentUpdated = "comment.updated"
	CommentRemoved = "comment.removed"
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
