package mqevent

import "time"

/* ============================================================
   PLACE EVENTS
============================================================ */

const (
	PlaceCreatedEvent = "place.created"
	PlaceUpdatedEvent = "place.updated"
	PlaceRemovedEvent = "place.removed"
)

/* ============================================================
   PLACE CREATED
============================================================ */

type PlaceCreatedPayload struct {
	PlaceID    string    `json:"place_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PLACE UPDATED
============================================================ */

type PlaceUpdatedPayload struct {
	PlaceID    string    `json:"place_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   PLACE REMOVED
============================================================ */

type PlaceRemovedPayload struct {
	PlaceID    string    `json:"place_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
