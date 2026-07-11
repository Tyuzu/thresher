package mqevent

import "time"

/* ============================================================
   PLACES EVENTS
============================================================ */

const (
	PlaceCreatedEvent = "places.created"
	PlaceUpdatedEvent = "places.updated"
	PlaceRemovedEvent = "places.removed"
)

type PlaceCreatedPayload struct {
	PlacesID   string    `json:"placeid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PlaceUpdatedPayload struct {
	PlacesID   string    `json:"placeid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PlaceDeletedPayload struct {
	PlacesID   string    `json:"placeid"`
	OccurredAt time.Time `json:"occurred_at"`
}
