package vendors

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the vendors package.

// Vendor Routes
func AddVendorRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authMiddleware := middleware.Authenticate(app)

	// Vendor management
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors", rateLimiter.Limit(authMiddleware(RegisterVendorHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors", rateLimiter.Limit(GetVendorsHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/me", rateLimiter.Limit(authMiddleware(GetMyVendorHandler(app))))

	// Vendor CRUD
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(GetVendorHandler(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(UpdateVendorHandler(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(UpdateVendorHandler(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(DeleteVendorHandler(app))))

	// Event vendor hiring
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors/events/:eventID/hire", rateLimiter.Limit(authMiddleware(HireVendorHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/events/:eventID", rateLimiter.Limit(GetEventVendorsHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/events/:eventID/vendor/:vendorID", rateLimiter.Limit(authMiddleware(RemoveVendorHandler(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/vendors/hiring/:hiringID/status", rateLimiter.Limit(authMiddleware(UpdateVendorStatusHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/me/requests", rateLimiter.Limit(authMiddleware(GetMyVendorRequestsHandler(app))))

	// Vendor availability
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/vendor/:vendorID/availability", rateLimiter.Limit(ListAvailabilityHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors/vendor/:vendorID/availability", rateLimiter.Limit(authMiddleware(CreateAvailabilityHandler(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/vendor/:vendorID/availability/:slotID", rateLimiter.Limit(authMiddleware(DeleteAvailabilityHandler(app))))
}
