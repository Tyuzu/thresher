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
	OccurredAt time.Time `json:"occurred_at"`
}

type IngestStartedPayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RecordingCompletePayload struct {
	VliveID    string    `json:"vliveid"`
	OccurredAt time.Time `json:"occurred_at"`
}
