package mqevent

import "time"

/* ============================================================
   BOOKING EVENTS
============================================================ */

const (
	BookingCreatedEvent   = "booking.created"
	BookingUpdatedEvent   = "booking.updated"
	BookingRemovedEvent   = "booking.removed"
	BookingCancelledEvent = "booking.cancelled"
	DateCapacitySetEvent  = "booking.capacity.updated"
	TierCreatedEvent      = "booking.tier.created"
	SlotCreatedEvent      = "booking.slot.created"
)

type BookingCreatedPayload struct {
	BookingID  string    `json:"bookingid"`
	UserID     string    `json:"userid,omitempty"`
	EntityID   string    `json:"entityid,omitempty"`
	EntityType string    `json:"entitytype,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingUpdatedPayload struct {
	BookingID  string    `json:"bookingid"`
	UserID     string    `json:"userid,omitempty"`
	Status     string    `json:"status,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingRemovedPayload struct {
	BookingID  string    `json:"bookingid"`
	UserID     string    `json:"userid,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingCancelledPayload struct {
	BookingID  string    `json:"bookingid"`
	UserID     string    `json:"userid,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DateCapacitySetPayload struct {
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	Date       string    `json:"date"`
	Capacity   int       `json:"capacity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TierCreatedPayload struct {
	TierID     string    `json:"tierid"`
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SlotCreatedPayload struct {
	SlotID     string    `json:"slotid"`
	TierID     string    `json:"tierid,omitempty"`
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	Date       string    `json:"date"`
	Start      string    `json:"start"`
	OccurredAt time.Time `json:"occurred_at"`
}
