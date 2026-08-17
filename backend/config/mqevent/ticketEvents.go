package mqevent

import "time"

/* ============================================================
   TICKET EVENTS
============================================================ */

const (
	TicketCreatedEvent     = "ticket.created"
	TicketUpdatedEvent     = "ticket.updated"
	TicketDeletedEvent     = "ticket.deleted"
	TicketBoughtEvent      = "ticket.bought"
	TicketCancelledEvent   = "ticket.cancelled"
	TicketTransferredEvent = "ticket.transferred"
)

/* ============================================================
   SEAT EVENTS
============================================================ */

const (
	SeatsLockedEvent           = "ticket.seats.locked"
	SeatsUnlockedEvent         = "ticket.seats.unlocked"
	SeatPurchaseConfirmedEvent = "ticket.seat.purchase.confirmed"
)

/* ============================================================
   PAYMENT EVENTS
============================================================ */

const (
	TicketPaymentSessionCreatedEvent = "ticket.payment.session.created"
)

/* ============================================================
   TICKET CREATED
============================================================ */

type TicketCreatedPayload struct {
	TicketID   string    `json:"ticket_id"`
	EventID    string    `json:"event_id,omitempty"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   TICKET UPDATED
============================================================ */

type TicketUpdatedPayload struct {
	TicketID   string    `json:"ticket_id"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   TICKET DELETED
============================================================ */

type TicketDeletedPayload struct {
	TicketID   string    `json:"ticket_id"`
	EventID    string    `json:"event_id,omitempty"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   TICKET BOUGHT
============================================================ */

type TicketBoughtPayload struct {
	TicketID   string    `json:"ticket_id"`
	UserID     string    `json:"user_id"`
	EventID    string    `json:"event_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   TICKET CANCELLED
============================================================ */

type TicketCancelledPayload struct {
	TicketID   string    `json:"ticket_id"`
	EventID    string    `json:"event_id"`
	UserID     string    `json:"user_id,omitempty"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   TICKET TRANSFERRED
============================================================ */

type TicketTransferredPayload struct {
	TicketID   string    `json:"ticket_id"`
	FromUserID string    `json:"from_user_id"`
	ToUserID   string    `json:"to_user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   SEATS LOCKED
============================================================ */

type SeatsLockedPayload struct {
	EventID    string    `json:"event_id"`
	SeatIDs    []string  `json:"seat_ids"`
	UserID     string    `json:"user_id,omitempty"`
	ExpiresAt  time.Time `json:"expires_at,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   SEATS UNLOCKED
============================================================ */

type SeatsUnlockedPayload struct {
	EventID    string    `json:"event_id"`
	SeatIDs    []string  `json:"seat_ids"`
	UserID     string    `json:"user_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   SEAT PURCHASE CONFIRMED
============================================================ */

type SeatPurchaseConfirmedPayload struct {
	TicketID   string    `json:"ticket_id"`
	EventID    string    `json:"event_id"`
	SeatIDs    []string  `json:"seat_ids"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PAYMENT SESSION
============================================================ */

type TicketPaymentSessionCreatedPayload struct {
	TicketID   string    `json:"ticket_id"`
	SessionID  string    `json:"session_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   SLOT
============================================================ */

type SlotDeletedPayload struct {
	SlotID     string    `json:"slot_id"`
	EventID    string    `json:"event_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
