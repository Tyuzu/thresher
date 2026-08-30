package events

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the events package.

func AddEventsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/events/events", rateLimiter.Limit(GetEvents(app)))            // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/events/events/count", rateLimiter.Limit(GetEventsCount(app))) // Public
	router.HandlerFunc(http.MethodPost, "/api/v1/events/event", authmidware(CreateEvent(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid", GetEvent(app)) // Public
	router.HandlerFunc(http.MethodPut, "/api/v1/events/event/:eventid", authmidware(EditEvent(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/events/event/:eventid", authmidware(DeleteEvent(app)))
}
