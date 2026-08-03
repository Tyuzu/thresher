package mqevent

import "time"

/* ============================================================
   NEWCHAT EVENTS
============================================================ */

const (
	NewchatCreated          = "newchat.created"
	NewchatUpdated          = "newchat.updated"
	NewchatRemoved          = "newchat.removed"
	ChatMessageCreatedEvent = "newchat.removed"
	FileAddedToChatEvent    = "newchat.removed"
)

type NewchatCreatedPayload struct {
	NewchatID  string    `json:"newchatid"`
	OccurredAt time.Time `json:"occurredat"`
}

type NewchatUpdatedPayload struct {
	NewchatID  string    `json:"newchatid"`
	OccurredAt time.Time `json:"occurredat"`
}

type NewchatDeletedPayload struct {
	NewchatID  string    `json:"newchatid"`
	OccurredAt time.Time `json:"occurredat"`
}

type ChatMessageCreatedPayload struct {
	NewchatID  string    `json:"newchatid"`
	OccurredAt time.Time `json:"occurredat"`
}

type FileAddedToChatPayload struct {
	NewchatID  string    `json:"newchatid"`
	OccurredAt time.Time `json:"occurredat"`
}
