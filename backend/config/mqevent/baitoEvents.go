package mqevent

import "time"

/* ============================================================
   BAITO EVENTS
============================================================ */

const (
	BaitoCreatedEvent   = "baito.created"
	BaitoUpdatedEvent   = "baito.updated"
	BaitoDeletedEvent   = "baito.deleted"
	AppliedToBaitoEvent = "baito.applied"

	WorkerProfileCreatedEvent = "worker.profile.created"
	WorkerProfileUpdatedEvent = "worker.profile.updated"
	WorkerProfileDeletedEvent = "worker.profile.deleted"
)

/* ============================================================
   BAITO
============================================================ */

type BaitoCreatedPayload struct {
	BaitoID    string    `json:"baito_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BaitoUpdatedPayload struct {
	BaitoID    string    `json:"baito_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BaitoDeletedPayload struct {
	BaitoID    string    `json:"baito_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppliedToBaitoPayload struct {
	BaitoID    string    `json:"baito_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   WORKER PROFILE
============================================================ */

type WorkerProfileCreatedPayload struct {
	WorkerProfileID string    `json:"worker_profile_id"`
	UserID          string    `json:"user_id"`
	OccurredAt      time.Time `json:"occurred_at"`
}

type WorkerProfileUpdatedPayload struct {
	WorkerProfileID string    `json:"worker_profile_id"`
	UserID          string    `json:"user_id"`
	OccurredAt      time.Time `json:"occurred_at"`
}

type WorkerProfileDeletedPayload struct {
	WorkerProfileID string    `json:"worker_profile_id"`
	UserID          string    `json:"user_id"`
	OccurredAt      time.Time `json:"occurred_at"`
}
