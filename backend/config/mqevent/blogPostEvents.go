package mqevent

import "time"

/* ============================================================
   POST EVENTS
============================================================ */

const (
	BlogPostCreatedEvent = "blogpost.created"
	BlogPostUpdatedEvent = "blogpost.updated"
	BlogPostDeletedEvent = "blogpost.deleted"
)

/* ============================================================
   POST CREATED
============================================================ */

type BlogPostCreatedPayload struct {
	BlogPostID string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	PostType   string    `json:"post_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   POST UPDATED
============================================================ */

type BlogPostUpdatedPayload struct {
	BlogPostID string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   POST DELETED
============================================================ */

type BlogPostDeletedPayload struct {
	BlogPostID string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
