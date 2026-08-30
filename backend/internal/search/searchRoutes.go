package search

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the search package.

// Search Routes - Public endpoints for search functionality
func AddSearchRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Autocomplete suggestions - public, rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/ac", rateLimiter.Limit(SearchAutocomplete(app)))

	// Search by entity type - public, rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/search/:tabId", rateLimiter.Limit(SearchByType(app)))
}
