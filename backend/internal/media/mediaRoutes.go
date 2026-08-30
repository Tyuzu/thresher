package media

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the media package.

func AddMediaRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public view, but rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/media/:entitytype/:entityid", rateLimiter.Limit(GetMedias(app)))

	// Authenticated actions
	router.HandlerFunc(http.MethodPost, "/api/v1/media/:entitytype/:entityid", rateLimiter.Limit(authmidware(AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(DeleteMedia(app))))
}
