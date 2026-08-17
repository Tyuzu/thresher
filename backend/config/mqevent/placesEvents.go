package mqevent

import "time"

/* ============================================================
   PLACE EVENTS
============================================================ */

const (
	PlaceCreatedEvent = "place.created"
	PlaceUpdatedEvent = "place.updated"
	PlaceDeletedEvent = "place.deleted"
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
   PLACE DELETED
============================================================ */

type PlaceDeletedPayload struct {
	PlaceID    string    `json:"place_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
