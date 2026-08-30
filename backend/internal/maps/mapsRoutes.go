package maps

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the maps package.

// AddMapRoutes registers all map endpoints including WebSocket tracking
func AddMapRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Unified Map Endpoint with Permalinks & Floor Multi-layers
	router.HandlerFunc(http.MethodGet, "/api/v1/gta/map", rateLimiter.Limit(GetGtaMap))

	// Distance measurement route
	router.HandlerFunc(http.MethodGet, "/api/v1/gta/map/distance", rateLimiter.Limit(CalculateDistance))

	// Real-Time WebSocket Player & Vehicle Tracking
	router.HandlerFunc(http.MethodGet, "/api/v1/gta/map/ws", HandleLiveTrackingWS)

	// Player progression routes
	router.HandlerFunc(http.MethodPost, "/api/v1/player/progress", rateLimiter.Limit(UpdatePlayerProgress))
	router.HandlerFunc(http.MethodGet, "/api/v1/player/progress", rateLimiter.Limit(GetPlayerProgress))
}
