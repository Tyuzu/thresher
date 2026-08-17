package mqevent

import "time"

/* ============================================================
   MERCH EVENTS
============================================================ */

const (
	MerchCreatedEvent               = "merch.created"
	MerchUpdatedEvent               = "merch.updated"
	MerchDeletedEvent               = "merch.deleted"
	MerchBoughtEvent                = "merch.bought"
	MerchPaymentSessionCreatedEvent = "merch.payment_session.created"
	MerchPurchaseConfirmedEvent     = "merch.purchase.confirmed"
)

/* ============================================================
   MERCH CREATED
============================================================ */

type MerchCreatedPayload struct {
	MerchID    string    `json:"merch_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MERCH UPDATED
============================================================ */

type MerchUpdatedPayload struct {
	MerchID    string    `json:"merch_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MERCH DELETED
============================================================ */

type MerchDeletedPayload struct {
	MerchID    string    `json:"merch_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MERCH BOUGHT
============================================================ */

type MerchBoughtPayload struct {
	MerchID    string    `json:"merch_id"`
	UserID     string    `json:"user_id,omitempty"`
	Quantity   int       `json:"quantity,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MERCH PAYMENT SESSION CREATED
============================================================ */

type MerchPaymentSessionCreatedPayload struct {
	MerchID    string    `json:"merch_id"`
	UserID     string    `json:"user_id,omitempty"`
	SessionID  string    `json:"session_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MERCH PURCHASE CONFIRMED
============================================================ */

type MerchPurchaseConfirmedPayload struct {
	MerchID    string    `json:"merch_id"`
	UserID     string    `json:"user_id,omitempty"`
	OrderID    string    `json:"order_id,omitempty"`
	Quantity   int       `json:"quantity,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
