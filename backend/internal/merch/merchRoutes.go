package merch

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the merch package.

func AddMerchRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create merch
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid", rateLimiter.Limit(authmidware(CreateMerch(app))))

	// Buy merch
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/buy", rateLimiter.Limit(authmidware(BuyMerch(app))))

	// Public view
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType/:eventid", GetMerchs(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType/:eventid/:merchid", GetMerch(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType", GetMerchPage(app))

	// Edit/Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/merch/:entityType/:eventid/:merchid", rateLimiter.Limit(authmidware(EditMerch(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/merch/:entityType/:eventid/:merchid", rateLimiter.Limit(authmidware(DeleteMerch(app))))

	// Payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/payment-session", rateLimiter.Limit(authmidware(CreateMerchPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/confirm-purchase", rateLimiter.Limit(authmidware(ConfirmMerchPurchase(app))))
}
