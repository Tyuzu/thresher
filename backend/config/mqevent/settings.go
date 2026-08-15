package mqevent

import "time"

/* ============================================================
   USER SETTINGS EVENTS
============================================================ */

const (
	UserSettingsUpdatedEvent   = "user.settings.updated"
	UserSettingsResetEvent     = "user.settings.reset"
	UserSettingsInitiatedEvent = "user.settings.initiated"
)

/* ============================================================
   USER SETTINGS UPDATED
============================================================ */

type UserSettingsUpdatedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   USER SETTINGS RESET
============================================================ */

type UserSettingsResetPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   USER SETTINGS INITIATED
============================================================ */

type UserSettingsInitiatedPayload struct {
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
