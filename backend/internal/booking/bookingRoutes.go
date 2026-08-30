package booking

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the booking package.

func AddBookingRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// existing routes
	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/slots", rateLimiter.Limit(authmidware(ListSlots(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/slots", rateLimiter.Limit(authmidware(CreateSlot(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/slots/:id", rateLimiter.Limit(authmidware(DeleteSlot(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/bookings", rateLimiter.Limit(authmidware(ListBookings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/bookings", rateLimiter.Limit(authmidware(CreateBooking(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/bookings/bookings/:id/status", rateLimiter.Limit(authmidware(UpdateBookingStatus(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/bookings/:id", rateLimiter.Limit(authmidware(CancelBooking(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/date-capacity", rateLimiter.Limit(authmidware(GetDateCapacity(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/date-capacity", rateLimiter.Limit(authmidware(SetDateCapacity(app))))

	// NEW: pricing tiers
	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/tiers", rateLimiter.Limit(authmidware(ListTiers(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/tiers", rateLimiter.Limit(authmidware(CreateTier(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/tiers/:id", rateLimiter.Limit(authmidware(DeleteTier(app))))

	// NEW: auto slot generation from tier
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/tiers/:id/generate-slots", rateLimiter.Limit(authmidware(GenerateSlotsFromTier(app))))
}
