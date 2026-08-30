package notices

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the notices package.

func AddNoticesRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// CREATE
	router.HandlerFunc(http.MethodPost, "/api/v1/notices/:entitytype/:entityid", rateLimiter.Limit(authmidware(CreateNotice(app))))

	// READ
	router.HandlerFunc(http.MethodGet, "/api/v1/notices/:entitytype/:entityid", GetNotices(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/notices/:entitytype/:entityid/:noticeid", GetNotice(app))

	// UPDATE + DELETE
	router.HandlerFunc(http.MethodPut, "/api/v1/notices/:entitytype/:entityid/:noticeid", rateLimiter.Limit(authmidware(UpdateNotice(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/notices/:entitytype/:entityid/:noticeid", rateLimiter.Limit(authmidware(DeleteNotice(app))))
}
