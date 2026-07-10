package mqevent

import "time"

/* ============================================================
   MAP EVENTS
============================================================ */

const (
	MapCreated = "map.created"
	MapUpdated = "map.updated"
	MapRemoved = "map.removed"
)

type MapCreatedPayload struct {
	MapID      string    `json:"mapid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MapUpdatedPayload struct {
	MapID      string    `json:"mapid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type MapDeletedPayload struct {
	MapID      string    `json:"mapid"`
	OccurredAt time.Time `json:"occurred_at"`
}
