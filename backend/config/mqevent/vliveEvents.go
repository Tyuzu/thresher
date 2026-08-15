package mqevent

import "time"

/* ============================================================
   VLIVE EVENTS
============================================================ */

const (
	StreamCreatedEvent     = "vlive.stream.created"
	IngestStartedEvent     = "vlive.ingest.started"
	RecordingCompleteEvent = "vlive.recording.completed"
)

/* ============================================================
   STREAM CREATED
============================================================ */

type StreamCreatedPayload struct {
	VliveID    string    `json:"vlive_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   INGEST STARTED
============================================================ */

type IngestStartedPayload struct {
	VliveID    string    `json:"vlive_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   RECORDING COMPLETED
============================================================ */

type RecordingCompletePayload struct {
	VliveID    string    `json:"vlive_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
