package profile

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the profile package.

func AddProfileRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Own profile
	router.HandlerFunc(http.MethodGet, "/api/v1/profile/profile", rateLimiter.Limit(authmidware(GetProfile(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/profile/edit", rateLimiter.Limit(authmidware(EditProfile(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/profile/delete", rateLimiter.Limit(authmidware(DeleteProfile(app))))

	// Public profile viewing
	router.HandlerFunc(http.MethodGet, "/api/v1/user/:username", rateLimiter.Limit(GetUserProfile(app)))
}
