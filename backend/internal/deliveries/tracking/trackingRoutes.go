package tracking

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the tracking package.

func AddTrackingRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	public := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(h)
	}

	protected := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(authmidware(h))
	}

	// PUBLIC TRACKING
	router.HandlerFunc(http.MethodGet, "/api/v1/tracking/:token", public(GetPublicTracking(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/tracking/:token/location", public(GetPublicLocation(app)))

	// TRACKING
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/tracking", protected(GetDeliveryTracking(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/location", protected(GetDeliveryLocation(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/events", protected(GetDeliveryEvents(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/status-history", protected(GetStatusHistory(app)))

	// PROOF OF DELIVERY
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/proof", protected(AddProof(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/proof", protected(GetProof(app)))

}
