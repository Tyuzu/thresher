package ads

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the ads package.

func AddAdsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public Serving & Analytics Endpoints
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/sda", rateLimiter.Limit(middleware.OptionalAuth(GetAds(app))))
	router.HandlerFunc(http.MethodOptions, "/api/v1/sda/sda", middleware.OptionalAuth(GetAds(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/sda/track-impression", rateLimiter.Limit(middleware.OptionalAuth(TrackImpression(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/track-impression", rateLimiter.Limit(middleware.OptionalAuth(TrackImpression(app))))
	router.HandlerFunc(http.MethodOptions, "/api/v1/sda/track-impression", middleware.OptionalAuth(TrackImpression(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/sda/track-click", rateLimiter.Limit(middleware.OptionalAuth(TrackClick(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/track-click", rateLimiter.Limit(middleware.OptionalAuth(TrackClick(app))))
	router.HandlerFunc(http.MethodOptions, "/api/v1/sda/track-click", middleware.OptionalAuth(TrackClick(app)))

	// Admin / Management CRUD Routes (Require Auth)
	router.HandlerFunc(http.MethodPost, "/api/v1/admin/ads", authmidware(CreateAd(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/admin/ads/promote-post", authmidware(PromotePostToAd(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/admin/ads", authmidware(ListAds(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/admin/ads/:id", authmidware(GetAdByID(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/admin/ads/:id", authmidware(UpdateAd(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/admin/ads/:id", authmidware(DeleteAd(app)))
}
