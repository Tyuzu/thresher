package mqevent

import "time"

/* ============================================================
   TICKET EVENTS
============================================================ */

const (
	TicketCreatedEvent               = "ticket.created"
	TicketUpdatedEvent               = "ticket.updated"
	TicketRemovedEvent               = "ticket.removed"
	TicketBoughtEvent                = "ticket.removed"
	TicketCancelledEvent             = "ticket.removed"
	SeatsLockedEvent                 = "ticket.removed"
	SeatsUnlockedEvent               = "ticket.removed"
	SeatPurchaseConfirmedEvent       = "ticket.removed"
	TicketPaymentSessionCreatedEvent = "ticket.removed"
	TicketTransferredEvent           = "ticket.removed"
	SlotDeletedEvent                 = "ticket.removed"
)

type TicketCreatedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TicketUpdatedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TicketDeletedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TicketBoughtPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TicketCancelledPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SeatsLockedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SeatsUnlockedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SeatPurchaseConfirmedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TicketPaymentSessionCreatedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type TicketTransferredPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SlotDeletedPayload struct {
	TicketID   string    `json:"ticketid"`
	OccurredAt time.Time `json:"occurred_at"`
}
