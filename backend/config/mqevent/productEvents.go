package mqevent

import "time"

/* ============================================================
   PRODUCT EVENTS
============================================================ */

const (
	ProductCreatedEvent = "product.created"
	ProductUpdatedEvent = "product.updated"
	ProductRemovedEvent = "product.removed"
)

/* ============================================================
   PRODUCT CREATED
============================================================ */

type ProductCreatedPayload struct {
	ProductID  string    `json:"product_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PRODUCT UPDATED
============================================================ */

type ProductUpdatedPayload struct {
	ProductID  string    `json:"product_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PRODUCT REMOVED
============================================================ */

type ProductRemovedPayload struct {
	ProductID  string    `json:"product_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
