package products

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the products package.

func AddProductRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid/buy", rateLimiter.Limit(authmidware(BuyCrop(app))))

	// 📦 Farm Orders
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/mine", authmidware(GetMyFarmOrders(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/incoming", authmidware(GetIncomingFarmOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/accept", rateLimiter.Limit(authmidware(AcceptOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/reject", rateLimiter.Limit(authmidware(RejectOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/deliver", rateLimiter.Limit(authmidware(MarkOrderDelivered(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/markpaid", rateLimiter.Limit(authmidware(MarkOrderPaid(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farmorders/order/:id/receipt", authmidware(DownloadReceipt(app)))
	// Bulk actions
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/accept", rateLimiter.Limit(authmidware(BulkAcceptOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/reject", rateLimiter.Limit(authmidware(BulkRejectOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/deliver", rateLimiter.Limit(authmidware(BulkMarkOrdersDelivered(app))))

	// 🛒 Items, Products, Tools
	// -- GET
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items", GetItems(app))                     // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items/categories", GetItemCategories(app)) // Public

	// -- Products (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/product", rateLimiter.Limit(authmidware(CreateProduct(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(UpdateProduct(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(DeleteProduct(app))))

	// -- Tools (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/tool", rateLimiter.Limit(authmidware(CreateTool(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(UpdateTool(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(DeleteTool(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/products/:entityType/:entityId", middleware.OptionalAuth(GetProductDetails(app)))
}
