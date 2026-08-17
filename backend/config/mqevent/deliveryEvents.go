package mqevent

import "time"

/* ============================================================
   DELIVERY EVENTS
============================================================ */

const (
	DeliveryCreatedEvent = "delivery.created"
	DeliveryUpdatedEvent = "delivery.updated"
	DeliveryDeletedEvent = "delivery.deleted"

	DeliveryAssignedEvent   = "delivery.assigned"
	DeliveryUnassignedEvent = "delivery.unassigned"

	DeliveryAcceptedEvent = "delivery.accepted"
	DeliveryRejectedEvent = "delivery.rejected"

	DeliveryPickedUpEvent       = "delivery.picked_up"
	DeliveryInTransitEvent      = "delivery.in_transit"
	DeliveryOutForDeliveryEvent = "delivery.out_for_delivery"
	DeliveryDeliveredEvent      = "delivery.delivered"

	DeliveryCancelledEvent = "delivery.cancelled"
	DeliveryFailedEvent    = "delivery.failed"

	DeliveryLocationUpdatedEvent = "delivery.location.updated"

	DeliveryProofCreatedEvent = "delivery.proof.created"
	DeliveryProofUpdatedEvent = "delivery.proof.updated"
	DeliveryProofDeletedEvent = "delivery.proof.deleted"
)

/* ============================================================
   DELIVERY CREATED
============================================================ */

type DeliveryCreatedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	UserID     string    `json:"user_id,omitempty"`
	OrderID    string    `json:"order_id,omitempty"`
	BookingID  string    `json:"booking_id,omitempty"`
	EntityID   string    `json:"entity_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   DELIVERY UPDATED
============================================================ */

type DeliveryUpdatedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   DELIVERY DELETED
============================================================ */

type DeliveryDeletedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   DRIVER ASSIGNMENT
============================================================ */

type DeliveryAssignedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryUnassignedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   DRIVER ACCEPTANCE
============================================================ */

type DeliveryAcceptedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryRejectedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   DELIVERY LIFECYCLE
============================================================ */

type DeliveryPickedUpPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryInTransitPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryOutForDeliveryPayload struct {
	DeliveryID          string     `json:"delivery_id"`
	DriverID            string     `json:"driver_id"`
	EstimatedDeliveryAt *time.Time `json:"estimated_delivery_at,omitempty"`
	OccurredAt          time.Time  `json:"occurred_at"`
}

type DeliveryDeliveredPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   DELIVERY CANCELLATION / FAILURE
============================================================ */

type DeliveryCancelledPayload struct {
	DeliveryID       string    `json:"delivery_id"`
	UserID           string    `json:"user_id,omitempty"`
	DriverID         string    `json:"driver_id,omitempty"`
	CancellationCode string    `json:"cancellation_code,omitempty"`
	Reason           string    `json:"reason,omitempty"`
	OccurredAt       time.Time `json:"occurred_at"`
}

type DeliveryFailedPayload struct {
	DeliveryID  string    `json:"delivery_id"`
	UserID      string    `json:"user_id,omitempty"`
	DriverID    string    `json:"driver_id,omitempty"`
	FailureCode string    `json:"failure_code,omitempty"`
	Reason      string    `json:"reason,omitempty"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   DELIVERY LOCATION
============================================================ */

type DeliveryLocationUpdatedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	DriverID   string    `json:"driver_id"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	RecordedAt time.Time `json:"recorded_at"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PROOF OF DELIVERY
============================================================ */

type DeliveryProofCreatedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	ProofID    string    `json:"proof_id"`
	DriverID   string    `json:"driver_id"`
	ProofType  string    `json:"proof_type"`
	AssetID    string    `json:"asset_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryProofUpdatedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	ProofID    string    `json:"proof_id"`
	DriverID   string    `json:"driver_id"`
	ProofType  string    `json:"proof_type,omitempty"`
	AssetID    string    `json:"asset_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DeliveryProofDeletedPayload struct {
	DeliveryID string    `json:"delivery_id"`
	ProofID    string    `json:"proof_id"`
	DriverID   string    `json:"driver_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
