package mqevent

import "time"

/* ============================================================
   PRODUCT EVENTS
============================================================ */

const (
	ProductCreatedEvent = "product.created"
	ProductUpdatedEvent = "product.updated"
	ProductDeletedEvent = "product.deleted"
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
   PRODUCT DELETED
============================================================ */

type ProductDeletedPayload struct {
	ProductID  string    `json:"product_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
