package suggestions

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the suggestions package.

func AddSuggestionsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/suggestions/places/nearby", rateLimiter.Limit(GetNearbyPlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/suggestions/follow", rateLimiter.Limit(authmidware(SuggestFollowers(app))))
}
