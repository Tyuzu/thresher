package mqevent

import "time"

/* ============================================================
   CART EVENTS
============================================================ */

const (
	CartItemCreatedEvent     = "cart.item.created"
	CartItemUpdatedEvent     = "cart.item.updated"
	CartItemDeletedEvent     = "cart.item.deleted"
	CartClearedEvent         = "cart.cleared"
	ItemQuantityUpdatedEvent = "cart.item.quantity.updated"
)

/* ============================================================
   CHECKOUT EVENTS
============================================================ */

const (
	CheckoutInitiatedEvent      = "checkout.initiated"
	CheckoutSessionCreatedEvent = "checkout.session.created"
	CouponValidatedEvent        = "coupon.validated"
)

/* ============================================================
   ORDER EVENTS
============================================================ */

const (
	OrderPlacedEvent = "order.placed"
)

/* ============================================================
   CART ITEM
============================================================ */

type CartItemCreatedPayload struct {
	CartItemID string    `json:"cart_item_id"`
	UserID     string    `json:"user_id"`
	ProductID  string    `json:"product_id"`
	Quantity   int       `json:"quantity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartItemUpdatedPayload struct {
	CartItemID string    `json:"cart_item_id"`
	UserID     string    `json:"user_id"`
	Quantity   int       `json:"quantity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CartItemDeletedPayload struct {
	CartItemID string    `json:"cart_item_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ItemQuantityUpdatedPayload struct {
	CartItemID string    `json:"cart_item_id"`
	UserID     string    `json:"user_id"`
	Quantity   int       `json:"quantity"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CART
============================================================ */

type CartClearedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CHECKOUT
============================================================ */

type CheckoutInitiatedPayload struct {
	UserID     string    `json:"user_id"`
	ItemCount  int       `json:"item_count"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CheckoutSessionCreatedPayload struct {
	CheckoutID string    `json:"checkout_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CouponValidatedPayload struct {
	UserID     string    `json:"user_id"`
	CouponCode string    `json:"coupon_code"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   ORDER
============================================================ */

type OrderPlacedPayload struct {
	OrderID    string    `json:"order_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
