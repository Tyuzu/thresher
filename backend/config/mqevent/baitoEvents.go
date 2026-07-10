package mqevent

import "time"

/* ============================================================
   BAITO EVENTS
============================================================ */

const (
	BaitoCreated = "baito.created"
	BaitoUpdated = "baito.updated"
	BaitoRemoved = "baito.removed"
)

type BaitoCreatedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BaitoUpdatedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BaitoDeletedPayload struct {
	BaitoID    string    `json:"baitoid"`
	OccurredAt time.Time `json:"occurred_at"`
}
