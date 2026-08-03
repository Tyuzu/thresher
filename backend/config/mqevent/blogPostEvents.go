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
	PostID     string    `json:"postid"`
	UserID     string    `json:"userid"`
	Username   string    `json:"username"`
	PostType   string    `json:"posttype"`
	OccurredAt time.Time `json:"occurredat"`
}

type BlogPostUpdatedPayload struct {
	PostID     string    `json:"postid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type BlogPostDeletedPayload struct {
	PostID     string    `json:"postid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}
