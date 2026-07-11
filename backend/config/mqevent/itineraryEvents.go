package mqevent

import "time"

/* ============================================================
   ITINERARY EVENTS
============================================================ */

const (
	ItineraryCreatedEvent   = "itinerary.created"
	ItineraryUpdatedEvent   = "itinerary.updated"
	ItineraryRemovedEvent   = "itinerary.removed"
	ItineraryForkedEvent    = "itinerary.removed"
	ItineraryPublishedEvent = "itinerary.removed"
)

type ItineraryCreatedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ItineraryUpdatedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ItineraryRemovedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ItineraryForkedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type ItineraryPublishedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurred_at"`
}
