package mqevent

import "time"

/* ============================================================
   MENU EVENTS
============================================================ */

const (
	MenuCreatedEvent                 = "menu.created"
	MenuUpdatedEvent                 = "menu.updated"
	MenuDeletedEvent                 = "menu.deleted"
	MenuBoughtEvent                  = "menu.bought"
	MenuPaymentSessionInitiatedEvent = "menu.payment_session.initiated"
)

/* ============================================================
   MENU CREATED
============================================================ */

type MenuCreatedPayload struct {
	MenuID     string    `json:"menu_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MENU UPDATED
============================================================ */

type MenuUpdatedPayload struct {
	MenuID     string    `json:"menu_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MENU DELETED
============================================================ */

type MenuDeletedPayload struct {
	MenuID     string    `json:"menu_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MENU BOUGHT
============================================================ */

type MenuBoughtPayload struct {
	MenuID     string    `json:"menu_id"`
	UserID     string    `json:"user_id,omitempty"`
	Quantity   int       `json:"quantity,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MENU PAYMENT SESSION INITIATED
============================================================ */

type MenuPaymentSessionInitiatedPayload struct {
	MenuID     string    `json:"menu_id"`
	UserID     string    `json:"user_id,omitempty"`
	SessionID  string    `json:"session_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
