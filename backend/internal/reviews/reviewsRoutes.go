package reviews

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the reviews package.

func AddReviewsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public view, but rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/reviews/:entityType/:entityId", rateLimiter.Limit(GetReviews(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(GetReview(app)))

	// Authenticated actions
	router.HandlerFunc(http.MethodPost, "/api/v1/reviews/:entityType/:entityId", rateLimiter.Limit(authmidware(AddReview(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(authmidware(EditReview(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(authmidware(DeleteReview(app))))
}
