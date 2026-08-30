package faqs

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the faqs package.

func AddFAQRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// Should probably require auth if restricted
	// Add FAQs for an entity
	// Create faq
	router.HandlerFunc(http.MethodPost, "/api/v1/faqs/:entitytype/:entityid", rateLimiter.Limit(authmidware(CreateFAQ(app))))

	// Get faqs for an entity (supports pagination/sorting via query params)
	router.HandlerFunc(http.MethodGet, "/api/v1/faqs/:entitytype/:entityid", GetFAQs(app)) // Public

	router.HandlerFunc(http.MethodGet, "/api/v1/faqs/:entitytype/:entityid/:faqid", GetFAQ(app))

	// Update & Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/faqs/:entitytype/:entityid/:faqid", rateLimiter.Limit(authmidware(UpdateFAQ(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/faqs/:entitytype/:entityid/:faqid", rateLimiter.Limit(authmidware(DeleteFAQ(app))))
}
