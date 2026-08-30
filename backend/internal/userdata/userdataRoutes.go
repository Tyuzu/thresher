package userdata

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the userdata package.

func AddUserdataRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Other user data (requires auth to see private info)
	router.HandlerFunc(http.MethodGet, "/api/v1/user/:username/data", rateLimiter.Limit(authmidware(GetUserProfileData(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/user/:username/udata", rateLimiter.Limit(authmidware(GetOtherUserProfileData(app))))

}
