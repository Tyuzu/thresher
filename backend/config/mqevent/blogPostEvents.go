package mqevent

import "time"

/* ============================================================
   POST EVENTS
============================================================ */

const (
	BlogPostCreatedEvent = "post.created"
	BlogPostUpdatedEvent = "post.updated"
	BlogPostDeletedEvent = "post.deleted"
)

type BlogPostCreatedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	PostType   string    `json:"post_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BlogPostUpdatedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BlogPostDeletedPayload struct {
	PostID     string    `json:"post_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
