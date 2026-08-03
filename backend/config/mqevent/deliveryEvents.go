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
	OccurredAt time.Time `json:"occurredat"`
}

type DeliveryUpdatedPayload struct {
	DeliveryID string    `json:"deliveryid"`
	OccurredAt time.Time `json:"occurredat"`
}

type DeliveryDeletedPayload struct {
	DeliveryID string    `json:"deliveryid"`
	OccurredAt time.Time `json:"occurredat"`
}
