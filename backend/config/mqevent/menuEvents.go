package mqevent

import "time"

/* ============================================================
   MENU EVENTS
============================================================ */

const (
	MenuCreated = "menu.created"
	MenuUpdated = "menu.updated"
	MenuRemoved = "menu.removed"
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
