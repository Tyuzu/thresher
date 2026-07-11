package mqevent

import "time"

/* ============================================================
   REPORT EVENTS
============================================================ */

const (
	ReportCreatedEvent                = "report.created"
	ReportUpdatedEvent                = "report.updated"
	ReportRemovedEvent                = "report.removed"
	AppealCreatedEvent                = "report.created"
	AppealUpdatedEvent                = "report.updated"
	AppealRemovedEvent                = "report.removed"
	AppliedForModeratorRoleEvent      = "report.removed"
	ApprovedModeratorRoleRequestEvent = "report.removed"
	RejectedModeratorRoleRequestEvent = "report.removed"
	ReportSoftDeletedEvent            = "report.removed"
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

type AppliedForModeratorRolePayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ApprovedModeratorRoleRequestPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RejectedModeratorRoleRequestPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealCreatedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealUpdatedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealDeletedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportSoftDeletedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}
