package mqevent

import "time"

/* ============================================================
   PLACES EVENTS
============================================================ */

const (
	PlacesCreated = "places.created"
	PlacesUpdated = "places.updated"
	PlacesRemoved = "places.removed"
)

type PlacesCreatedPayload struct {
	PlacesID   string    `json:"placeid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PlacesUpdatedPayload struct {
	PlacesID   string    `json:"placeid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type PlacesDeletedPayload struct {
	PlacesID   string    `json:"placeid"`
	OccurredAt time.Time `json:"occurred_at"`
}
