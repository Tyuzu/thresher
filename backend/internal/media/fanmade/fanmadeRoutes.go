package fanmade

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the fanmade package.

func AddFanmadeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(GetMedias(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(authmidware(AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(DeleteMedia(app))))
}
