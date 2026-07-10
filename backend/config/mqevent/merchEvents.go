package mqevent

import "time"

/* ============================================================
   MERCH EVENTS
============================================================ */

const (
	MerchCreated = "merch.created"
	MerchUpdated = "merch.updated"
	MerchRemoved = "merch.removed"
)

type MerchCreatedPayload struct {
	MerchID    string    `json:"merchid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MerchUpdatedPayload struct {
	MerchID    string    `json:"merchid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MerchDeletedPayload struct {
	MerchID    string    `json:"merchid"`
	OccurredAt time.Time `json:"occurred_at"`
}
