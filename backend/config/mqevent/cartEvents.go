package mqevent

import "time"

/* ============================================================
   CARTITEM EVENTS
============================================================ */

const (
	CartItemCreated = "cartitem.created"
	CartItemUpdated = "cartitem.updated"
	CartItemRemoved = "cartitem.removed"
)

type CartItemCreatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartItemUpdatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartItemDeletedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}
