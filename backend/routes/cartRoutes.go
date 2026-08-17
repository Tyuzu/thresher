package routes

import (
	"naevis/infra"
	"naevis/internal/cart"
	"naevis/internal/merch"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddCartRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Cart operations
	router.HandlerFunc(http.MethodPost, "/api/v1/cart", rateLimiter.Limit(authmidware(cart.AddToCart(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/cart", authmidware(cart.GetCart(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/update", rateLimiter.Limit(authmidware(cart.UpdateCart(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart/item", rateLimiter.Limit(authmidware(cart.RemoveFromCart(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart", rateLimiter.Limit(authmidware(cart.ClearCart(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/cart/item", rateLimiter.Limit(authmidware(cart.UpdateItemQuantity(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/checkout", rateLimiter.Limit(authmidware(cart.InitiateCheckout(app))))

	// Checkout session creation
	router.HandlerFunc(http.MethodPost, "/api/v1/checkout/session", rateLimiter.Limit(authmidware(cart.CreateCheckoutSession(app))))

	// Order placement
	router.HandlerFunc(http.MethodPost, "/api/v1/order", rateLimiter.Limit(authmidware(cart.PlaceOrder(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/order/mine", authmidware(cart.GetMyOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/coupon/validate", rateLimiter.Limit(authmidware(cart.ValidateCouponHandler(app))))

}

func AddMerchRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create merch
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid", rateLimiter.Limit(authmidware(merch.CreateMerch(app))))

	// Buy merch
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/buy", rateLimiter.Limit(authmidware(merch.BuyMerch(app))))

	// Public view
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType/:eventid", merch.GetMerchs(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType/:eventid/:merchid", merch.GetMerch(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType", merch.GetMerchPage(app))

	// Edit/Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/merch/:entityType/:eventid/:merchid", rateLimiter.Limit(authmidware(merch.EditMerch(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/merch/:entityType/:eventid/:merchid", rateLimiter.Limit(authmidware(merch.DeleteMerch(app))))

	// Payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/payment-session", rateLimiter.Limit(authmidware(merch.CreateMerchPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/confirm-purchase", rateLimiter.Limit(authmidware(merch.ConfirmMerchPurchase(app))))
}
