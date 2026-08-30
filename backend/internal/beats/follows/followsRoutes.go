package follows

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the follows package.

func AddFollowRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {

	authmidware := middleware.Authenticate(app)

	// Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(ToggleFollow(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(ToggleUnFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/follows/:id/status", rateLimiter.Limit(authmidware(DoesFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/followers/:id", rateLimiter.Limit(GetFollowers(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/following/:id", rateLimiter.Limit(GetFollowing(app)))
}
