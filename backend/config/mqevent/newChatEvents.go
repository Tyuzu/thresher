package mqevent

import "time"

/* ============================================================
   CHAT EVENTS
============================================================ */

const (
	ChatCreatedEvent        = "chat.created"
	ChatUpdatedEvent        = "chat.updated"
	ChatDeletedEvent        = "chat.deleted"
	ChatMessageCreatedEvent = "chat.message.created"
	FileAddedToChatEvent    = "chat.file.added"
)

/* ============================================================
   CHAT CREATED
============================================================ */

type ChatCreatedPayload struct {
	ChatID     string    `json:"chat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CHAT UPDATED
============================================================ */

type ChatUpdatedPayload struct {
	ChatID     string    `json:"chat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CHAT DELETED
============================================================ */

type ChatDeletedPayload struct {
	ChatID     string    `json:"chat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CHAT MESSAGE CREATED
============================================================ */

type ChatMessageCreatedPayload struct {
	MessageID  string    `json:"message_id"`
	ChatID     string    `json:"chat_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FILE ADDED TO CHAT
============================================================ */

type FileAddedToChatPayload struct {
	FileID     string    `json:"file_id"`
	ChatID     string    `json:"chat_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
