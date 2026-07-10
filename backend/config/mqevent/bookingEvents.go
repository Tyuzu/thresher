package mqevent

import "time"

/* ============================================================
   BOOKING EVENTS
============================================================ */

const (
	BookingCreated = "booking.created"
	BookingUpdated = "booking.updated"
	BookingRemoved = "booking.removed"
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
