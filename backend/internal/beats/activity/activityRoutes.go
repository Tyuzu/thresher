package activity

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the activity package.

func AddActivityRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// If activity log/feed is user-specific, keep auth
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/activity/log", rateLimiter.Limit(authmidware(LogActivities(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/activity/get", authmidware(GetActivityFeed(app)))

	// Public analytics/telemetry ingestion
	router.HandlerFunc(http.MethodPost, "/api/v1/scitylana/event", HandleAnalyticsEvent(app))
}
