package mqevent

import "time"

/* ============================================================
   MERCH EVENTS
============================================================ */

const (
	MerchCreatedEvent               = "merch.created"
	MerchUpdatedEvent               = "merch.updated"
	MerchDeletedEvent               = "merch.removed"
	MerchBoughtEvent                = "merch.removed"
	MerchPaymentSessionCreatedEvent = "merch.removed"
	MerchPurchaseConfirmedEvent     = "merch.removed"
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

type MerchBoughtPayload struct {
	MerchID    string    `json:"merchid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MerchPaymentSessionCreatedPayload struct {
	MerchID    string    `json:"merchid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MerchPurchaseConfirmedPayload struct {
	MerchID    string    `json:"merchid"`
	OccurredAt time.Time `json:"occurred_at"`
}
