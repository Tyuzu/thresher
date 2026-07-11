package mqevent

import "time"

/* ============================================================
   MENU EVENTS
============================================================ */

const (
	MenuCreatedEvent                 = "menu.created"
	MenuUpdatedEvent                 = "menu.updated"
	MenuRemovedEvent                 = "menu.removed"
	MenuBoughtEvent                  = "menu.removed"
	MenuPaymentSessionInitiatedEvent = "menu.removed"
)

type MenuCreatedPayload struct {
	MenuID     string    `json:"menuid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MenuUpdatedPayload struct {
	MenuID     string    `json:"menuid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MenuDeletedPayload struct {
	MenuID     string    `json:"menuid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MenuBoughtPayload struct {
	MenuID     string    `json:"menuid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MenuPaymentSessionInitiatedPayload struct {
	MenuID     string    `json:"menuid"`
	OccurredAt time.Time `json:"occurred_at"`
}
