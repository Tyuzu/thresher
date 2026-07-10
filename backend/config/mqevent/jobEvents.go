package mqevent

import "time"

/* ============================================================
   JOB EVENTS
============================================================ */

const (
	JobCreated = "job.created"
	JobUpdated = "job.updated"
	JobRemoved = "job.removed"
)

type JobCreatedPayload struct {
	JobID      string    `json:"jobid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type JobUpdatedPayload struct {
	JobID      string    `json:"jobid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type JobDeletedPayload struct {
	JobID      string    `json:"jobid"`
	OccurredAt time.Time `json:"occurred_at"`
}
