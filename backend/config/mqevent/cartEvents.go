package mqevent

import "time"

/* ============================================================
   CARTITEM EVENTS
============================================================ */

const (
	CartItemCreated             = "cartitem.created"
	CartItemUpdated             = "cartitem.updated"
	CartItemRemoved             = "cartitem.removed"
	CartClearedEvent            = "cartitem.removed"
	ItemQuantityUpdatedEvent    = "cartitem.removed"
	CheckoutInitiatedEvent      = "cartitem.removed"
	CheckoutSeccionCreatedEvent = "cartitem.removed"
	CouponValidatedEvent        = "cartitem.removed"
	OrderPlacedEvent            = "cartitem.removed"
	ItemRemovedFromCartEvent    = "cartitem.removed"
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

type ItemQuantityUpdatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CheckoutInitiatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CheckoutSeccionCreatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CouponValidatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OrderPlacedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ItemRemovedFromCartPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartClearedPayload struct {
	CartItemID string    `json:"cartitemid"`
	OccurredAt time.Time `json:"occurred_at"`
}
