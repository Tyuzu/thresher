package jobs

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the jobs package.

func AddJobRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/jobs/:entitytype/:entityid", rateLimiter.Limit(GetJobsRelatedTOEntity(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/jobs/:entitytype/:entityid", rateLimiter.Limit(authmidware(CreateBaitoForEntity(app))))
}
