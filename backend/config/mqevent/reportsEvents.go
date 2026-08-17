package mqevent

import "time"

/* ============================================================
   REPORT & MODERATION EVENTS
============================================================ */

const (
	/* -------------------------
	   Reports
	------------------------- */

	ReportCreatedEvent     = "report.created"
	ReportUpdatedEvent     = "report.updated"
	ReportDeletedEvent     = "report.deleted"
	ReportSoftDeletedEvent = "report.soft_deleted"

	/* -------------------------
	   Appeals
	------------------------- */

	AppealCreatedEvent = "appeal.created"
	AppealUpdatedEvent = "appeal.updated"
	AppealDeletedEvent = "appeal.deleted"

	/* -------------------------
	   Moderator Applications
	------------------------- */

	AppliedForModeratorRoleEvent      = "moderator.application.created"
	ApprovedModeratorRoleRequestEvent = "moderator.application.approved"
	RejectedModeratorRoleRequestEvent = "moderator.application.rejected"
)

/* ============================================================
   REPORT PAYLOADS
============================================================ */

type ReportCreatedPayload struct {
	ReportID   string    `json:"report_id"`
	ReporterID string    `json:"reporter_id,omitempty"`
	TargetType string    `json:"target_type"`
	TargetID   string    `json:"target_id"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportUpdatedPayload struct {
	ReportID    string    `json:"report_id"`
	Status      string    `json:"status"`
	ActionTaken string    `json:"action_taken,omitempty"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ReportDeletedPayload struct {
	ReportID   string    `json:"report_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ReportSoftDeletedPayload struct {
	ReportID   string    `json:"report_id,omitempty"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	ActorID    string    `json:"actor_id,omitempty"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   APPEAL PAYLOADS
============================================================ */

type AppealCreatedPayload struct {
	AppealID   string    `json:"appeal_id"`
	UserID     string    `json:"user_id"`
	ReportID   string    `json:"report_id,omitempty"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealUpdatedPayload struct {
	AppealID   string    `json:"appeal_id"`
	Status     string    `json:"status"`
	ReviewerID string    `json:"reviewer_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppealDeletedPayload struct {
	AppealID   string    `json:"appeal_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MODERATOR APPLICATION PAYLOADS
============================================================ */

type AppliedForModeratorRolePayload struct {
	ApplicationID string    `json:"application_id"`
	UserID        string    `json:"user_id"`
	OccurredAt    time.Time `json:"occurred_at"`
}

type ApprovedModeratorRoleRequestPayload struct {
	ApplicationID string    `json:"application_id"`
	UserID        string    `json:"user_id,omitempty"`
	ApprovedBy    string    `json:"approved_by,omitempty"`
	ApprovedAt    time.Time `json:"approved_at"`
	OccurredAt    time.Time `json:"occurred_at"`
}

type RejectedModeratorRoleRequestPayload struct {
	ApplicationID string    `json:"application_id"`
	UserID        string    `json:"user_id,omitempty"`
	RejectedBy    string    `json:"rejected_by,omitempty"`
	RejectedAt    time.Time `json:"rejected_at"`
	OccurredAt    time.Time `json:"occurred_at"`
}

/* ============================================================
   HELPER CONSTRUCTORS
============================================================ */

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

func NewApprovedModeratorRoleRequestPayload(applicationID, userID, approvedBy string) ApprovedModeratorRoleRequestPayload {
	now := time.Now().UTC()
	return ApprovedModeratorRoleRequestPayload{
		ApplicationID: applicationID,
		UserID:        userID,
		ApprovedBy:    approvedBy,
		ApprovedAt:    now,
		OccurredAt:    now,
	}
}

func NewRejectedModeratorRoleRequestPayload(applicationID, userID, rejectedBy string) RejectedModeratorRoleRequestPayload {
	now := time.Now().UTC()
	return RejectedModeratorRoleRequestPayload{
		ApplicationID: applicationID,
		UserID:        userID,
		RejectedBy:    rejectedBy,
		RejectedAt:    now,
		OccurredAt:    now,
	}
}
