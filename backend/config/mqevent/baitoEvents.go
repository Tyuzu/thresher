package mqevent

import "time"

/* ============================================================
   BAITO EVENTS
============================================================ */

const (
	BaitoCreatedEvent   = "baito.created"
	BaitoUpdatedEvent   = "baito.updated"
	BaitoRemovedEvent   = "baito.removed"
	AppliedToBaitoEvent = "baito.applied"

	WorkerProfileCreatedEvent = "worker.profile.created"
	WorkerProfileUpdatedEvent = "worker.profile.updated"
	WorkerProfileRemovedEvent = "worker.profile.removed"
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

type BaitoRemovedPayload struct {
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

type WorkerProfileRemovedPayload struct {
	WorkerProfileID string    `json:"worker_profile_id"`
	UserID          string    `json:"user_id"`
	OccurredAt      time.Time `json:"occurred_at"`
}
