package mqevent

import "time"

/* ============================================================
   JOB EVENTS
============================================================ */

const (
	JobCreatedEvent = "job.created"
	JobUpdatedEvent = "job.updated"
	JobRemovedEvent = "job.removed"
)

/* ============================================================
   JOB CREATED
============================================================ */

type JobCreatedPayload struct {
	JobID      string    `json:"job_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   JOB UPDATED
============================================================ */

type JobUpdatedPayload struct {
	JobID      string    `json:"job_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   JOB REMOVED
============================================================ */

type JobRemovedPayload struct {
	JobID      string    `json:"job_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
