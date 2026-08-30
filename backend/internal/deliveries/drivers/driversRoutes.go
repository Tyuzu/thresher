package drivers

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the drivers package.

func AddDriverRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	protected := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(authmidware(h))
	}

	// DRIVERS
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me", protected(GetProfile(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/drivers/me", protected(UpdateProfile(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/online", protected(GoOnline(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/offline", protected(GoOffline(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/status", protected(GetStatus(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/deliveries", protected(GetAvailableJobs(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/deliveries/active", protected(GetActiveDeliveries(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/deliveries/:deliveryid/claim", protected(ClaimJob(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/deliveries/:deliveryid/accept", protected(AcceptJob(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/deliveries/:deliveryid/reject", protected(RejectJob(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/location", protected(SendGPSLocation(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/location", protected(GetCurrentGPS(app)))

}
