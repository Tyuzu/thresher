package mqevent

import "time"

/* ============================================================
   BOOKING EVENTS
============================================================ */

const (
	BookingCreatedEvent   = "booking.created"
	BookingUpdatedEvent   = "booking.updated"
	BookingRemovedEvent   = "booking.removed"
	BookingCancelledEvent = "booking.removed"
	DateCapacitySetEvent  = "booking.removed"
	TierCreatedEvent      = "booking.removed"
	SlotCreatedEvent      = "booking.removed"
)

type BookingCreatedPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingUpdatedPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingDeletedPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BookingCancelledPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type DateCapacitySetPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TierCreatedPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SlotCreatedPayload struct {
	BookingID  string    `json:"bookingid"`
	OccurredAt time.Time `json:"occurred_at"`
}
