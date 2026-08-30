package itinerary

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the itinerary package.

func AddItineraryRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public
	router.HandlerFunc(http.MethodGet, "/api/v1/itineraries", rateLimiter.Limit(GetItineraries(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/itineraries/all/:id", rateLimiter.Limit(GetItinerary(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/itineraries/search", rateLimiter.Limit(SearchItineraries(app)))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/itineraries", rateLimiter.Limit(authmidware(CreateItinerary(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/itineraries/:id", rateLimiter.Limit(authmidware(UpdateItinerary(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/itineraries/:id", rateLimiter.Limit(authmidware(DeleteItinerary(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/itineraries/:id/fork", rateLimiter.Limit(authmidware(ForkItinerary(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/itineraries/:id/publish", rateLimiter.Limit(authmidware(PublishItinerary(app))))
}
