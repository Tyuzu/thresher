package mqevent

import "time"

/* ============================================================
   CARTITEM EVENTS
============================================================ */

const (
	CartItemCreatedEvent        = "cart.item.created"
	CartItemUpdatedEvent        = "cart.item.updated"
	CartItemRemovedEvent        = "cart.item.removed"
	CartClearedEvent            = "cart.cleared"
	ItemQuantityUpdatedEvent    = "cart.item.quantity.updated"
	CheckoutInitiatedEvent      = "checkout.initiated"
	CheckoutSessionCreatedEvent = "checkout.session.created"
	CouponValidatedEvent        = "coupon.validated"
	OrderPlacedEvent            = "order.placed"
	ItemRemovedFromCartEvent    = "cart.item.removed"
)

type CartItemCreatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	UserID     string    `json:"userid"`
	ProductID  string    `json:"productid"`
	Quantity   int       `json:"quantity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartItemUpdatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	UserID     string    `json:"userid"`
	Quantity   int       `json:"quantity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartItemDeletedPayload struct {
	CartItemID string    `json:"cartitemid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ItemQuantityUpdatedPayload struct {
	CartItemID string    `json:"cartitemid"`
	UserID     string    `json:"userid"`
	Quantity   int       `json:"quantity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CheckoutInitiatedPayload struct {
	UserID     string    `json:"userid"`
	ItemCount  int       `json:"item_count"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CheckoutSessionCreatedPayload struct {
	CheckoutID string    `json:"checkoutid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CheckoutSeccionCreatedPayload = CheckoutSessionCreatedPayload

type CouponValidatedPayload struct {
	UserID     string    `json:"userid"`
	CouponCode string    `json:"coupon_code"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OrderPlacedPayload struct {
	OrderID    string    `json:"orderid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ItemRemovedFromCartPayload struct {
	CartItemID string    `json:"cartitemid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartClearedPayload struct {
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}
