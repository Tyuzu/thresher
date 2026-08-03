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
	OccurredAt  time.Time `json:"occurredat"`
}

type ItineraryUpdatedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurredat"`
}

type ItineraryRemovedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurredat"`
}

type ItineraryForkedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurredat"`
}

type ItineraryPublishedPayload struct {
	ItineraryID string    `json:"itineraryid"`
	OccurredAt  time.Time `json:"occurredat"`
}
