package cart

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the cart package.

func AddCartRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Cart operations
	router.HandlerFunc(http.MethodPost, "/api/v1/cart", rateLimiter.Limit(authmidware(AddToCart(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/cart", authmidware(GetCart(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/update", rateLimiter.Limit(authmidware(UpdateCart(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart/item", rateLimiter.Limit(authmidware(RemoveFromCart(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart", rateLimiter.Limit(authmidware(ClearCart(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/cart/item", rateLimiter.Limit(authmidware(UpdateItemQuantity(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/checkout", rateLimiter.Limit(authmidware(InitiateCheckout(app))))

	// Checkout session creation
	router.HandlerFunc(http.MethodPost, "/api/v1/checkout/session", rateLimiter.Limit(authmidware(CreateCheckoutSession(app))))

	// Order placement
	router.HandlerFunc(http.MethodPost, "/api/v1/order", rateLimiter.Limit(authmidware(PlaceOrder(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/order/mine", authmidware(GetMyOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/coupon/validate", rateLimiter.Limit(authmidware(ValidateCouponHandler(app))))

}
