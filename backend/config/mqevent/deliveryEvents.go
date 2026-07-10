package mqevent

import "time"

/* ============================================================
   DELIVERY EVENTS
============================================================ */

const (
	DeliveryCreated = "delivery.created"
	DeliveryUpdated = "delivery.updated"
	DeliveryRemoved = "delivery.removed"
)

type DeliveryCreatedPayload struct {
	DeliveryID string    `json:"deliveryid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryUpdatedPayload struct {
	DeliveryID string    `json:"deliveryid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryDeletedPayload struct {
	DeliveryID string    `json:"deliveryid"`
	OccurredAt time.Time `json:"occurred_at"`
}
