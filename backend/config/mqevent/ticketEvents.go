package mqevent

import "time"

/* ============================================================
   TICKET EVENTS
============================================================ */

const (
	TicketCreated = "ticket.created"
	TicketUpdated = "ticket.updated"
	TicketRemoved = "ticket.removed"
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
