package routes

import (
	"naevis/infra"
	"naevis/internal/farms"
	"naevis/internal/farms/crops"
	"naevis/internal/products"
	"naevis/internal/recipes"
	"naevis/middleware"
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
	router.HandlerFunc(http.MethodPost, "/api/v1/farms/farm/:id/crops", rateLimiter.Limit(authmidware(crops.AddCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(crops.EditCrop(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(crops.DeleteCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid/buy", rateLimiter.Limit(authmidware(products.BuyCrop(app))))

	// 📊 Dashboard
	router.HandlerFunc(http.MethodGet, "/api/v1/dash/farms", authmidware(farms.GetFarmDash(app)))

	// 📦 Farm Orders
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/mine", authmidware(products.GetMyFarmOrders(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/incoming", authmidware(products.GetIncomingFarmOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/accept", rateLimiter.Limit(authmidware(products.AcceptOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/reject", rateLimiter.Limit(authmidware(products.RejectOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/deliver", rateLimiter.Limit(authmidware(products.MarkOrderDelivered(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/markpaid", rateLimiter.Limit(authmidware(products.MarkOrderPaid(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farmorders/order/:id/receipt", authmidware(products.DownloadReceipt(app)))
	// Bulk actions
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/accept", rateLimiter.Limit(authmidware(products.BulkAcceptOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/reject", rateLimiter.Limit(authmidware(products.BulkRejectOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/deliver", rateLimiter.Limit(authmidware(products.BulkMarkOrdersDelivered(app))))

	// 🌾 Crop catalogue & type browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/crops", crops.GetFilteredCrops(app))                 // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/catalogue", crops.GetCropCatalogue(app))       // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/precatalogue", crops.GetPreCropCatalogue(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/types", crops.GetCropTypes(app))               // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/crop/:cropname", middleware.OptionalAuth(farms.GetCropTypeFarms(app)))

	// Crop Wiki
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about", rateLimiter.Limit(crops.GetAllCropAboutsHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/crops/about", rateLimiter.Limit(crops.CreateCropAboutHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about/:cropid", rateLimiter.Limit(crops.GetCropAboutHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/crops/about/:cropid", rateLimiter.Limit(crops.DeleteCropAboutHandler(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/crops/about/:cropid", rateLimiter.Limit(crops.UpdateCropAboutHandler(app)))

	// 🛒 Items, Products, Tools
	// -- GET
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items", products.GetItems(app))                     // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items/categories", products.GetItemCategories(app)) // Public

	// -- Products (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/product", rateLimiter.Limit(authmidware(products.CreateProduct(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(products.UpdateProduct(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(products.DeleteProduct(app))))

	// -- Tools (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/tool", rateLimiter.Limit(authmidware(products.CreateTool(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(products.UpdateTool(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(products.DeleteTool(app))))

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
