package autocomplete

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the autocomplete package.

func AddAutocompleteRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/ac/places", rateLimiter.Limit(AutocompletePlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/ac/users", rateLimiter.Limit(AutocompleteUsers(app)))
}
