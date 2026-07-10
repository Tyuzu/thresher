package mqevent

import "time"

/* ============================================================
   FILE EVENTS
============================================================ */

const (
	FileCreated = "file.created"
	FileUpdated = "file.updated"
	FileRemoved = "file.removed"
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
