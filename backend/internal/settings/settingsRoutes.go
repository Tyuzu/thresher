package settings

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the settings package.

func AddSettingsRoutes(
	router *httprouter.Router,
	app *infra.Deps,
	rateLimiter *middleware.RateLimiter,
) {
	authmidware := middleware.Authenticate(app)

	router.HandlerFunc(http.MethodGet, "/api/v1/settings", rateLimiter.Limit(authmidware(GetSettings(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/settings/schema", rateLimiter.Limit(authmidware(GetSettingsSchema(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/settings", rateLimiter.Limit(authmidware(UpdateSettings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/settings/reset", rateLimiter.Limit(authmidware(ResetSettings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/settings/init", rateLimiter.Limit(authmidware(InitUserSettings(app))))

	// router.HandlerFunc(http.MethodGet,
	// 	"/api/v1/settings/init/:userid",
	// 	rateLimiter.Limit(authmidware(InitUserSettings(app))),
	// )

	// router.HandlerFunc(http.MethodGet,
	// 	"/api/v1/settings/all",
	// 	rateLimiter.Limit(authmidware(GetUserSettings(app))),
	// )

	// router.HandlerFunc(http.MethodPut,
	// 	"/api/v1/settings/setting/:type",
	// 	rateLimiter.Limit(authmidware(UpdateUserSetting(app))),
	// )
}
