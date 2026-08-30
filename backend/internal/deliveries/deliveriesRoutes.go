package deliveries

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the deliveries package.

func AddDeliveryRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	protected := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(authmidware(h))
	}

	// DELIVERIES
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries", protected(CreateDelivery(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries", protected(GetMyDeliveries(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid", protected(GetDeliveryByID(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/deliveries/:deliveryid/status", protected(UpdateDeliveryStatus(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/deliveries/:deliveryid", protected(CancelDelivery(app)))

	// LIFECYCLE
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/assign", protected(AssignDriver(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/accept", protected(AcceptAssignment(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/pickup", protected(MarkPickedUp(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/start", protected(StartDelivery(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/complete", protected(CompleteDelivery(app)))

}
