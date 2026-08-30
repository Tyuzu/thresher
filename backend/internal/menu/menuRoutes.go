package menu

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the menu package.

func AddMenuRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Menus (public view + auth for changes)
	router.HandlerFunc(http.MethodGet, "/api/v1/places/menu/:placeid", rateLimiter.Limit(GetMenus(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/menu/:placeid/:menuid/stock", rateLimiter.Limit(GetStock(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/menu/:placeid/:menuid", rateLimiter.Limit(GetMenu(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid", rateLimiter.Limit(authmidware(CreateMenu(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/places/menu/:placeid/:menuid", rateLimiter.Limit(authmidware(EditMenu(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/places/menu/:placeid/:menuid", rateLimiter.Limit(authmidware(DeleteMenu(app))))

	// Buying & payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid/:menuid/buy", rateLimiter.Limit(authmidware(BuyMenu(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid/:menuid/payment-session", rateLimiter.Limit(authmidware(CreateMenuPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid/:menuid/confirm-purchase", rateLimiter.Limit(authmidware(ConfirmMenuPurchase(app))))
}
