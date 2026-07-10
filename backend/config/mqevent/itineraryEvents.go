package mqevent

import "time"

/* ============================================================
   ITINERARY EVENTS
============================================================ */

const (
	ItineraryCreated = "itinerary.created"
	ItineraryUpdated = "itinerary.updated"
	ItineraryRemoved = "itinerary.removed"
)

type ItineraryCreatedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ItineraryUpdatedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ItineraryDeletedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}
