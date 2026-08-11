package mqevent

import "time"

/* ============================================================
   REPORT & MODERATION EVENTS
============================================================ */

const (
	// Reports
	ReportCreatedEvent     = "report.created"
	ReportUpdatedEvent     = "report.updated"
	ReportRemovedEvent     = "report.removed"
	ReportSoftDeletedEvent = "report.soft_deleted"

	// Appeals
	AppealCreatedEvent = "appeal.created"
	AppealUpdatedEvent = "appeal.updated"
	AppealRemovedEvent = "appeal.removed"

	// Moderator Applications
	AppliedForModeratorRoleEvent      = "moderator.application.created"
	ApprovedModeratorRoleRequestEvent = "moderator.application.approved"
	RejectedModeratorRoleRequestEvent = "moderator.application.rejected"
)

// --- Report Payloads ---

type ReportCreatedPayload struct {
	ReportID   string    `json:"reportid"`
	ReporterID string    `json:"reporterid,omitempty"`
	TargetType string    `json:"targettype"`
	TargetID   string    `json:"targetid"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportUpdatedPayload struct {
	ReportID    string    `json:"reportid"`
	Status      string    `json:"status"`
	ActionTaken string    `json:"action_taken,omitempty"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ReportDeletedPayload struct {
	ReportID   string    `json:"reportid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportSoftDeletedPayload struct {
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	ActorID    string    `json:"actorid,omitempty"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

// --- Appeal Payloads ---

type AppealCreatedPayload struct {
	AppealID   string    `json:"appealid"`
	UserID     string    `json:"userid"`
	ReportID   string    `json:"reportid,omitempty"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealUpdatedPayload struct {
	AppealID   string    `json:"appealid"`
	Status     string    `json:"status"`
	ReviewerID string    `json:"reviewerid,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealDeletedPayload struct {
	AppealID   string    `json:"appealid"`
	OccurredAt time.Time `json:"occurred_at"`
}

// --- Moderator Application Payloads ---

type AppliedForModeratorRolePayload struct {
	ApplicationID string    `json:"applicationid"`
	UserID        string    `json:"userid"`
	OccurredAt    time.Time `json:"occurred_at"`
}

type ApprovedModeratorRoleRequestPayload struct {
	ApplicationID string    `json:"applicationid"`
	UserID        string    `json:"userid,omitempty"`
	ApprovedBy    string    `json:"approved_by,omitempty"`
	ApprovedAt    time.Time `json:"approved_at"`
	OccurredAt    time.Time `json:"occurred_at"`
}

type RejectedModeratorRoleRequestPayload struct {
	ApplicationID string    `json:"applicationid"`
	UserID        string    `json:"userid,omitempty"`
	RejectedBy    string    `json:"rejected_by,omitempty"`
	RejectedAt    time.Time `json:"rejected_at"`
	OccurredAt    time.Time `json:"occurred_at"`
}

// --- Helper Constructors ---

func NewReportCreatedPayload(reportID, reporterID, targetType, targetID, reason string) ReportCreatedPayload {
	return ReportCreatedPayload{
		ReportID:   reportID,
		ReporterID: reporterID,
		TargetType: targetType,
		TargetID:   targetID,
		Reason:     reason,
		OccurredAt: time.Now().UTC(),
	}
}

func NewApprovedModeratorRolePayload(applicationID, userID, approvedBy string) ApprovedModeratorRoleRequestPayload {
	now := time.Now().UTC()
	return ApprovedModeratorRoleRequestPayload{
		ApplicationID: applicationID,
		UserID:        userID,
		ApprovedBy:    approvedBy,
		ApprovedAt:    now,
		OccurredAt:    now,
	}
}

func NewRejectedModeratorRolePayload(applicationID, userID, rejectedBy string) RejectedModeratorRoleRequestPayload {
	now := time.Now().UTC()
	return RejectedModeratorRoleRequestPayload{
		ApplicationID: applicationID,
		UserID:        userID,
		RejectedBy:    rejectedBy,
		RejectedAt:    now,
		OccurredAt:    now,
	}
}
