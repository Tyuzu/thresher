package mqevent

import "time"

/* ============================================================
   PRODUCT EVENTS
============================================================ */

const (
	ProductCreated = "product.created"
	ProductUpdated = "product.updated"
	ProductRemoved = "product.removed"
)

type ProductCreatedPayload struct {
	ProductID  string    `json:"productid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ProductUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ProductDeletedPayload struct {
	ProductID  string    `json:"productid"`
	OccurredAt time.Time `json:"occurred_at"`
}
