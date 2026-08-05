package artists

import "naevis/models"

// CreateArtistEventRequest defines the shape of the body to create an event.
type CreateArtistEventRequest struct {
	Title string `json:"title"`
	Date  string `json:"date"` // Expects "YYYY-MM-DD"
	Venue string `json:"venue"`
}

// CreateArtistEventResponse returning data after creation success.
type CreateArtistEventResponse struct {
	Message string `json:"message"`
	ID      string `json:"id"`
}

// AddArtistToEventRequest captures standard event mapping requirements.
type AddArtistToEventRequest struct {
	EventID string `json:"eventid"`
}

// GenericMessageResponse is reused across successful operations.
type GenericMessageResponse struct {
	Message string `json:"message"`
}

type ArtistToEventRequestPayload struct {
	EventID  string `json:"eventid"`
	ArtistID string `json:"artistid"`
}

type ArtistByIDResponse struct {
	models.Artist
	IsSubscribed bool `json:"issubscribed"`
}
