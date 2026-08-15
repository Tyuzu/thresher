package mqevent

import "time"

/* ============================================================
   POST EVENTS
============================================================ */

const (
	PostCreatedEvent = "post.created"
	PostUpdatedEvent = "post.updated"
	PostDeletedEvent = "post.deleted"
)

/* ============================================================
   POST CREATED
============================================================ */

type PostCreatedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	PostType   string    `json:"post_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   POST UPDATED
============================================================ */

type PostUpdatedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   POST DELETED
============================================================ */

type PostDeletedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
