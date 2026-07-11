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

	WorkerProfileCreatedEvent = "worker.created"
	WorkerProfileUpdatedEvent = "worker.updated"
	WorkerProfileRemovedEvent = "worker.removed"
)

type BaitoCreatedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BaitoUpdatedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BaitoRemovedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type AppliedToBaitoPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type WorkerProfileCreatedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type WorkerProfileUpdatedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}
