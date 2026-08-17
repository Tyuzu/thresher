package mqevent

import "time"

/* ============================================================
   MECHAT EVENTS
============================================================ */

const (
	MechatCreatedEvent   = "mechat.created"
	MechatUpdatedEvent   = "mechat.updated"
	MechatDeletedEvent   = "mechat.deleted"
	ChatMessageSentEvent = "mechat.message.sent"
)

/* ============================================================
   MECHAT CREATED
============================================================ */

type MechatCreatedPayload struct {
	MechatID   string    `json:"mechat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MECHAT UPDATED
============================================================ */

type MechatUpdatedPayload struct {
	MechatID   string    `json:"mechat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MECHAT DELETED
============================================================ */

type MechatDeletedPayload struct {
	MechatID   string    `json:"mechat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CHAT MESSAGE SENT
============================================================ */

type ChatMessageSentPayload struct {
	MessageID  string    `json:"message_id"`
	UserID     string    `json:"user_id"`
	MechatID   string    `json:"mechat_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
