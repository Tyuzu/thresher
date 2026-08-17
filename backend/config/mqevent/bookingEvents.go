package mqevent

import "time"

/* ============================================================
   BOOKING EVENTS
============================================================ */

const (
	BookingCreatedEvent   = "booking.created"
	BookingUpdatedEvent   = "booking.updated"
	BookingDeletedEvent   = "booking.deleted"
	BookingCancelledEvent = "booking.cancelled"

	DateCapacitySetEvent = "booking.capacity.updated"

	TierCreatedEvent = "booking.tier.created"
	SlotCreatedEvent = "booking.slot.created"
)

/* ============================================================
   BOOKING
============================================================ */

type BookingCreatedPayload struct {
	BookingID  string    `json:"booking_id"`
	UserID     string    `json:"user_id,omitempty"`
	EntityID   string    `json:"entity_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	Status     string    `json:"status,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingUpdatedPayload struct {
	BookingID  string    `json:"booking_id"`
	UserID     string    `json:"user_id,omitempty"`
	Status     string    `json:"status,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingDeletedPayload struct {
	BookingID  string    `json:"booking_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingCancelledPayload struct {
	BookingID  string    `json:"booking_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CAPACITY
============================================================ */

type DateCapacitySetPayload struct {
	EntityID    string    `json:"entity_id"`
	EntityType  string    `json:"entity_type"`
	Date        string    `json:"date"`
	Capacity    int       `json:"capacity"`
	OccurredAt  time.Time `json:"occurred_at"`
	OldCapacity int       `json:"old_capacity"`
	NewCapacity int       `json:"new_capacity"`
}

/* ============================================================
   TIERS
============================================================ */

type TierCreatedPayload struct {
	TierID     string    `json:"tier_id"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   SLOTS
============================================================ */

type SlotCreatedPayload struct {
	SlotID     string    `json:"slot_id"`
	TierID     string    `json:"tier_id,omitempty"`
	EntityID   string    `json:"entity_id"`
	EntityType string    `json:"entity_type"`
	Date       string    `json:"date"`
	Start      string    `json:"start"`
	OccurredAt time.Time `json:"occurred_at"`
}

const (
	TierUpdatedEvent = "booking.tier.updated"
	TierDeletedEvent = "booking.tier.deleted"

	SlotUpdatedEvent = "booking.slot.updated"
	SlotDeletedEvent = "booking.slot.deleted"
)
