package routes

import (
	"scav/infra"
	"scav/internal/baito"
	"scav/internal/baito/jobs"
	"scav/internal/baito/vendors"
	"scav/internal/baito/workers"
	"scav/internal/booking"
	"scav/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddBaitoRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create / update jobs → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/baito", rateLimiter.Limit(authmidware(baito.CreateBaito(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(authmidware(baito.UpdateBaito(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(authmidware(baito.DeleteBaito(app))))

	// Public job browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/latest", rateLimiter.Limit(baito.GetLatestBaitos(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/related", rateLimiter.Limit(baito.GetRelatedBaitos(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(baito.GetBaitoByID(app)))

	// Owner-specific views → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/mine", authmidware(baito.GetMyBaitos(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/baito/:baitoid/applicants", authmidware(baito.GetBaitoApplicants(app)))

	// Part-timer actions → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/baito/:baitoid/apply", authmidware(baito.ApplyToBaito(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/applications", authmidware(baito.GetMyApplications(app)))

	// Profile creation → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/profile", authmidware(workers.CreateWorkerProfile(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/baitos/profile/:workerId", authmidware(workers.UpdateWorkerProfile(app)))

	// Worker directory (probably private) → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers", rateLimiter.Limit(workers.GetWorkers(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers/skills", rateLimiter.Limit(workers.GetWorkerSkills(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/worker/:workerId", rateLimiter.Limit(workers.GetWorkerById(app)))
}

func AddJobRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/jobs/:entitytype/:entityid", rateLimiter.Limit(jobs.GetJobsRelatedTOEntity(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/jobs/:entitytype/:entityid", rateLimiter.Limit(authmidware(jobs.CreateBaitoForEntity(app))))
}

func AddBookingRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// existing routes
	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/slots", rateLimiter.Limit(authmidware(booking.ListSlots(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/slots", rateLimiter.Limit(authmidware(booking.CreateSlot(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/slots/:id", rateLimiter.Limit(authmidware(booking.DeleteSlot(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/bookings", rateLimiter.Limit(authmidware(booking.ListBookings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/bookings", rateLimiter.Limit(authmidware(booking.CreateBooking(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/bookings/bookings/:id/status", rateLimiter.Limit(authmidware(booking.UpdateBookingStatus(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/bookings/:id", rateLimiter.Limit(authmidware(booking.CancelBooking(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/date-capacity", rateLimiter.Limit(authmidware(booking.GetDateCapacity(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/date-capacity", rateLimiter.Limit(authmidware(booking.SetDateCapacity(app))))

	// NEW: pricing tiers
	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/tiers", rateLimiter.Limit(authmidware(booking.ListTiers(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/tiers", rateLimiter.Limit(authmidware(booking.CreateTier(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/tiers/:id", rateLimiter.Limit(authmidware(booking.DeleteTier(app))))

	// NEW: auto slot generation from tier
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/tiers/:id/generate-slots", rateLimiter.Limit(authmidware(booking.GenerateSlotsFromTier(app))))
}

// Vendor Routes
func AddVendorRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authMiddleware := middleware.Authenticate(app)

	// Vendor management
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors", rateLimiter.Limit(authMiddleware(vendors.RegisterVendorHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors", rateLimiter.Limit(vendors.GetVendorsHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/me", rateLimiter.Limit(authMiddleware(vendors.GetMyVendorHandler(app))))

	// Vendor CRUD
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(vendors.GetVendorHandler(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.UpdateVendorHandler(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.UpdateVendorHandler(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.DeleteVendorHandler(app))))

	// Event vendor hiring
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors/events/:eventID/hire", rateLimiter.Limit(authMiddleware(vendors.HireVendorHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/events/:eventID", rateLimiter.Limit(vendors.GetEventVendorsHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/events/:eventID/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.RemoveVendorHandler(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/vendors/hiring/:hiringID/status", rateLimiter.Limit(authMiddleware(vendors.UpdateVendorStatusHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/me/requests", rateLimiter.Limit(authMiddleware(vendors.GetMyVendorRequestsHandler(app))))

	// Vendor availability
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/vendor/:vendorID/availability", rateLimiter.Limit(vendors.ListAvailabilityHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors/vendor/:vendorID/availability", rateLimiter.Limit(authMiddleware(vendors.CreateAvailabilityHandler(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/vendor/:vendorID/availability/:slotID", rateLimiter.Limit(authMiddleware(vendors.DeleteAvailabilityHandler(app))))
}
