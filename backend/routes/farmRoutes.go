package routes

import (
	"naevis/farms"
	"naevis/infra"
	"naevis/middleware"
	"naevis/recipes"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func RegisterFarmRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// 🌾 Farm CRUD
	router.HandlerFunc(http.MethodPost, "/api/v1/farms", rateLimiter.Limit(authmidware(farms.CreateFarm(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farms", farms.GetPaginatedFarms(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farms/farm/:id", middleware.OptionalAuth(farms.GetFarm(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id", rateLimiter.Limit(authmidware(farms.EditFarm(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id", rateLimiter.Limit(authmidware(farms.DeleteFarm(app))))

	// 🌱 Crops (within farm)
	router.HandlerFunc(http.MethodPost, "/api/v1/farms/farm/:id/crops", rateLimiter.Limit(authmidware(farms.AddCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(farms.EditCrop(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(farms.DeleteCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid/buy", rateLimiter.Limit(authmidware(farms.BuyCrop(app))))

	// 📊 Dashboard
	router.HandlerFunc(http.MethodGet, "/api/v1/dash/farms", authmidware(farms.GetFarmDash(app)))

	// 📦 Farm Orders
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/mine", authmidware(farms.GetMyFarmOrders(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/incoming", authmidware(farms.GetIncomingFarmOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/accept", rateLimiter.Limit(authmidware(farms.AcceptOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/reject", rateLimiter.Limit(authmidware(farms.RejectOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/deliver", rateLimiter.Limit(authmidware(farms.MarkOrderDelivered(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/markpaid", rateLimiter.Limit(authmidware(farms.MarkOrderPaid(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farmorders/order/:id/receipt", authmidware(farms.DownloadReceipt(app)))
	// Bulk actions
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/accept", rateLimiter.Limit(authmidware(farms.BulkAcceptOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/reject", rateLimiter.Limit(authmidware(farms.BulkRejectOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/deliver", rateLimiter.Limit(authmidware(farms.BulkMarkOrdersDelivered(app))))

	// 🌾 Crop catalogue & type browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/crops", farms.GetFilteredCrops(app))                 // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/catalogue", farms.GetCropCatalogue(app))       // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/precatalogue", farms.GetPreCropCatalogue(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/types", farms.GetCropTypes(app))               // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/crop/:cropname", middleware.OptionalAuth(farms.GetCropTypeFarms(app)))

	// Crop Wiki
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about", rateLimiter.Limit(farms.GetAllCropAboutsHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/crops/about", rateLimiter.Limit(farms.CreateCropAboutHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about/:cropid", rateLimiter.Limit(farms.GetCropAboutHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/crops/about/:cropid", rateLimiter.Limit(farms.DeleteCropAboutHandler(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/crops/about/:cropid", rateLimiter.Limit(farms.UpdateCropAboutHandler(app)))

	// 🛒 Items, Products, Tools
	// -- GET
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items", farms.GetItems(app))                     // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items/categories", farms.GetItemCategories(app)) // Public

	// -- Products (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/product", rateLimiter.Limit(authmidware(farms.CreateProduct(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(farms.UpdateProduct(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(farms.DeleteProduct(app))))

	// -- Tools (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/tool", rateLimiter.Limit(authmidware(farms.CreateTool(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(farms.UpdateTool(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(farms.DeleteTool(app))))

	// 🖼 Upload
	// router.HandlerFunc(http.MethodPost,"/api/v1/upload/images", rateLimiter.Limit(authmidware(utils.UploadImages)))

	// Weather
	router.HandlerFunc(http.MethodGet, "/api/v1/weather", farms.GetWeather(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/farms/my", authmidware(farms.GetMyFarms(app)))
}

func AddRecipeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes/tags", rateLimiter.Limit(recipes.GetRecipeTags(app)))         // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes", middleware.OptionalAuth(recipes.GetRecipes(app)))           // Public/optional
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes/recipe/:id", middleware.OptionalAuth(recipes.GetRecipe(app))) // Public/optional

	// Modifications require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/recipes", authmidware(recipes.CreateRecipe(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/recipes/recipe/:id", authmidware(recipes.UpdateRecipe(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/recipes/recipe/:id", authmidware(recipes.DeleteRecipe(app)))
}
