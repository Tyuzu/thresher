package crops

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the crops package.

func AddCropRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// 🌱 Crops (within farm)
	router.HandlerFunc(http.MethodPost, "/api/v1/farms/farm/:id/crops", rateLimiter.Limit(authmidware(AddCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(EditCrop(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(DeleteCrop(app))))

	// 🌾 Crop catalogue & type browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/crops", GetFilteredCrops(app))                 // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/catalogue", GetCropCatalogue(app))       // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/precatalogue", GetPreCropCatalogue(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/types", GetCropTypes(app))               // Public

	// Crop Wiki
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about", rateLimiter.Limit(GetAllCropAboutsHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/crops/about", rateLimiter.Limit(CreateCropAboutHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about/:cropid", rateLimiter.Limit(GetCropAboutHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/crops/about/:cropid", rateLimiter.Limit(DeleteCropAboutHandler(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/crops/about/:cropid", rateLimiter.Limit(UpdateCropAboutHandler(app)))

}
