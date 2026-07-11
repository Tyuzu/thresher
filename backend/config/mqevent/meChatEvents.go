package mqevent

import "time"

/* ============================================================
   MECHAT EVENTS
============================================================ */

const (
	MechatCreated        = "mechat.created"
	MechatUpdated        = "mechat.updated"
	MechatRemoved        = "mechat.removed"
	ChatMessageSentEvent = "mechat.removed"
)

type MechatCreatedPayload struct {
	MechatID   string    `json:"mechatid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MechatUpdatedPayload struct {
	MechatID   string    `json:"mechatid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MechatDeletedPayload struct {
	MechatID   string    `json:"mechatid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ChatMessageSentPayload struct {
	MechatID   string    `json:"mechatid"`
	OccurredAt time.Time `json:"occurred_at"`
}
