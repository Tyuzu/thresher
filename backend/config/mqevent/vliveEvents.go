package mqevent

import "time"

/* ============================================================
   VLIVE EVENTS
============================================================ */

const (
	StreamCreatedEvent     = "vlive.created"
	IngestStartedEvent     = "vlive.updated"
	RecordingCompleteEvent = "vlive.removed"
)

type StreamCreatedPayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurredat"`
}

type IngestStartedPayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurredat"`
}

type RecordingCompletePayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurredat"`
}
