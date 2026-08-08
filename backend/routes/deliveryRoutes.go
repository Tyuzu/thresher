package routes

import (
	"naevis/infra"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddDeliveryRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// Helper wrapper for protected endpoints requiring auth + rate limiting
	protected := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(authmidware(h))
	}

	// Helper wrapper for public endpoints requiring rate limiting only
	public := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(h)
	}

	// =========================================================================
	// DELIVERIES
	// =========================================================================
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries", protected(deliveries.CreateDelivery(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries", protected(deliveries.GetMyDeliveries(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid", protected(deliveries.GetDeliveryByID(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/deliveries/:deliveryid", protected(deliveries.CancelDelivery(app)))

	// =========================================================================
	// LIFECYCLE
	// =========================================================================
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/assign", protected(deliveries.AssignDriver(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/accept", protected(deliveries.AcceptAssignment(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/pickup", protected(deliveries.MarkPickedUp(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/start", protected(deliveries.StartDelivery(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/complete", protected(deliveries.CompleteDelivery(app)))

	// =========================================================================
	// TRACKING (PROTECTED)
	// =========================================================================
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/tracking", protected(tracking.GetDeliveryTracking(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/location", protected(tracking.GetDeliveryLocation(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/events", protected(tracking.GetDeliveryEvents(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/status-history", protected(tracking.GetStatusHistory(app)))

	// =========================================================================
	// PROOF OF DELIVERY
	// =========================================================================
	router.HandlerFunc(http.MethodPost, "/api/v1/deliveries/:deliveryid/proof", protected(deliveries.AddProof(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/deliveries/:deliveryid/proof", protected(deliveries.GetProof(app)))

	// =========================================================================
	// DRIVERS ME
	// =========================================================================
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me", protected(drivers.GetProfile(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/drivers/me", protected(drivers.UpdateProfile(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/online", protected(drivers.GoOnline(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/offline", protected(drivers.GoOffline(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/status", protected(drivers.GetStatus(app)))

	// Driver Jobs & Actions
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/deliveries", protected(drivers.GetAvailableJobs(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/deliveries/active", protected(drivers.GetActiveDeliveries(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/deliveries/:deliveryid/accept", protected(drivers.AcceptJob(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/deliveries/:deliveryid/reject", protected(drivers.RejectJob(app)))

	// Driver GPS
	router.HandlerFunc(http.MethodPost, "/api/v1/drivers/me/location", protected(drivers.SendGPSLocation(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/drivers/me/location", protected(drivers.GetCurrentGPS(app)))

	// =========================================================================
	// PUBLIC TRACKING (NO AUTH REQUIRED)
	// =========================================================================
	router.HandlerFunc(http.MethodGet, "/api/v1/tracking/:token", public(tracking.GetPublicTracking(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/tracking/:token/location", public(tracking.GetPublicLocation(app)))

	// =========================================================================
	// WEBHOOKS
	// =========================================================================
	router.HandlerFunc(http.MethodPost, "/api/v1/webhooks", protected(webhooks.CreateWebhook(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/webhooks", protected(webhooks.ListWebhooks(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/webhooks/:webhookid", protected(webhooks.GetWebhook(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/webhooks/:webhookid", protected(webhooks.UpdateWebhook(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/webhooks/:webhookid", protected(webhooks.DeleteWebhook(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/webhooks/:webhookid/test", protected(webhooks.TestWebhook(app)))
}
