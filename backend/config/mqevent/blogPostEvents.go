package mqevent

import "time"

/* ============================================================
   POST EVENTS
============================================================ */

const (
	PostCreated = "post.created"
	PostUpdated = "post.updated"
	PostDeleted = "post.deleted"
)

type PostCreatedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	PostType   string    `json:"post_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PostUpdatedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PostDeletedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
