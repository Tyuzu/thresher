package workers

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the workers package.

func AddWorkerRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Profile creation → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/profile", authmidware(CreateWorkerProfile(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/baitos/profile/:workerId", authmidware(UpdateWorkerProfile(app)))

	// Worker directory (probably private) → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers", rateLimiter.Limit(GetWorkers(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers/skills", rateLimiter.Limit(GetWorkerSkills(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/worker/:workerId", rateLimiter.Limit(GetWorkerById(app)))
}
