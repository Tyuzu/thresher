package farms

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the farms package.

func AddFarmRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// 🌾 Farm CRUD
	router.HandlerFunc(http.MethodPost, "/api/v1/farms", rateLimiter.Limit(authmidware(CreateFarm(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farms", GetPaginatedFarms(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farms/farm/:id", middleware.OptionalAuth(GetFarm(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id", rateLimiter.Limit(authmidware(EditFarm(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id", rateLimiter.Limit(authmidware(DeleteFarm(app))))

	// 📊 Dashboard
	router.HandlerFunc(http.MethodGet, "/api/v1/dash/farms", authmidware(GetFarmDash(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/crops/crop/:cropname", middleware.OptionalAuth(GetCropTypeFarms(app)))

	// 🖼 Upload
	// router.HandlerFunc(http.MethodPost,"/api/v1/upload/images", rateLimiter.Limit(authmidware(utils.UploadImages)))

	// Weather
	router.HandlerFunc(http.MethodGet, "/api/v1/weather", GetWeather(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/farms/my", authmidware(GetMyFarms(app)))
}
