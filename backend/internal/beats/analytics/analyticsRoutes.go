package analytics

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the analytics package.

func AddAnalyticsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/antics/:entityType/:entityId", rateLimiter.Limit(GetEntityAnalytics))
}
