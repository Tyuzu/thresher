package mqevent

import "time"

/* ============================================================
   REPORT EVENTS
============================================================ */

const (
	ReportCreated = "report.created"
	ReportUpdated = "report.updated"
	ReportRemoved = "report.removed"
)

type ReportCreatedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportUpdatedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportDeletedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}
