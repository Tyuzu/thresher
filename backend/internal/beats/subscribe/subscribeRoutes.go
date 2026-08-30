package subscribe

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the subscribe package.

func AddSubscribeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {

	authmidware := middleware.Authenticate(app)

	// Subscribes / Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(SubscribeEntity(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(UnsubscribeEntity(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(DoesSubscribeEntity(app))))

	// Get all subscribers of a user/artist
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribers/:id", rateLimiter.Limit(GetSubscribers(app)))

}
