package mqevent

import "time"

/* ============================================================
   JOB EVENTS
============================================================ */

const (
	JobCreatedEvent = "job.created"
	JobUpdatedEvent = "job.updated"
	JobDeletedEvent = "job.deleted"
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
   JOB DELETED
============================================================ */

type JobDeletedPayload struct {
	JobID      string    `json:"job_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
