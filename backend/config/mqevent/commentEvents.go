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

/* ============================================================
   COMMENT CREATED
============================================================ */

type CommentCreatedPayload struct {
	CommentID  string    `json:"comment_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   COMMENT UPDATED
============================================================ */

type CommentUpdatedPayload struct {
	CommentID  string    `json:"comment_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   COMMENT REMOVED
============================================================ */

type CommentRemovedPayload struct {
	CommentID  string    `json:"comment_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
