package mqevent

import "time"

/* ============================================================
   FILE EVENTS
============================================================ */

const (
	FileCreatedEvent = "file.created"
	FileUpdatedEvent = "file.updated"
	FileRemovedEvent = "file.removed"
)

type FileCreatedPayload struct {
	FileID     string    `json:"fileid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FileUpdatedPayload struct {
	FileID     string    `json:"fileid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FileDeletedPayload struct {
	FileID     string    `json:"fileid"`
	OccurredAt time.Time `json:"occurred_at"`
}
