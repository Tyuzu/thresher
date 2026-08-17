package mqevent

import "time"

/* ============================================================
   MAP EVENTS
============================================================ */

const (
	MapCreatedEvent = "map.created"
	MapUpdatedEvent = "map.updated"
	MapDeletedEvent = "map.deleted"
)

/* ============================================================
   MAP CREATED
============================================================ */

type MapCreatedPayload struct {
	MapID      string    `json:"map_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MAP UPDATED
============================================================ */

type MapUpdatedPayload struct {
	MapID      string    `json:"map_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   MAP DELETED
============================================================ */

type MapDeletedPayload struct {
	MapID      string    `json:"map_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
