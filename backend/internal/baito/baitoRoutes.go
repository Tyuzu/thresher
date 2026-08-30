package baito

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the baito package.

func AddBaitoRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create / update jobs → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/baito", rateLimiter.Limit(authmidware(CreateBaito(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(authmidware(UpdateBaito(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(authmidware(DeleteBaito(app))))

	// Public job browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/latest", rateLimiter.Limit(GetLatestBaitos(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/related", rateLimiter.Limit(GetRelatedBaitos(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(GetBaitoByID(app)))

	// Owner-specific views → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/mine", authmidware(GetMyBaitos(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/baito/:baitoid/applicants", authmidware(GetBaitoApplicants(app)))

	// Part-timer actions → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/baito/:baitoid/apply", authmidware(ApplyToBaito(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/applications", authmidware(GetMyApplications(app)))

}
