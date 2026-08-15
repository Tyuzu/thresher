package mqevent

import "time"

/* ============================================================
   ITINERARY EVENTS
============================================================ */

const (
	ItineraryCreatedEvent   = "itinerary.created"
	ItineraryUpdatedEvent   = "itinerary.updated"
	ItineraryRemovedEvent   = "itinerary.removed"
	ItineraryForkedEvent    = "itinerary.forked"
	ItineraryPublishedEvent = "itinerary.published"
)

/* ============================================================
   ITINERARY CREATED
============================================================ */

type ItineraryCreatedPayload struct {
	ItineraryID string    `json:"itinerary_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   ITINERARY UPDATED
============================================================ */

type ItineraryUpdatedPayload struct {
	ItineraryID string    `json:"itinerary_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   ITINERARY REMOVED
============================================================ */

type ItineraryRemovedPayload struct {
	ItineraryID string    `json:"itinerary_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   ITINERARY FORKED
============================================================ */

type ItineraryForkedPayload struct {
	ItineraryID       string    `json:"itinerary_id"`
	ForkedItineraryID string    `json:"forked_itinerary_id,omitempty"`
	UserID            string    `json:"user_id,omitempty"`
	OccurredAt        time.Time `json:"occurred_at"`
}

/* ============================================================
   ITINERARY PUBLISHED
============================================================ */

type ItineraryPublishedPayload struct {
	ItineraryID string    `json:"itinerary_id"`
	UserID      string    `json:"user_id,omitempty"`
	OccurredAt  time.Time `json:"occurred_at"`
}
