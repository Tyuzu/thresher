package routes

import (
	"naevis/cart"
	"naevis/infra"
	"naevis/middleware"
	"naevis/stripe"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddCartRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	cartHandler := cart.NewCartHandler(app)
	// Cart operations
	router.HandlerFunc(http.MethodPost, "/api/v1/cart", rateLimiter.Limit(authmidware(cartHandler.AddToCart())))
	router.HandlerFunc(http.MethodGet, "/api/v1/cart", authmidware(cartHandler.GetCart()))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/update", rateLimiter.Limit(authmidware(cartHandler.UpdateCart())))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart/item", rateLimiter.Limit(authmidware(cartHandler.RemoveFromCart())))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart", rateLimiter.Limit(authmidware(cartHandler.ClearCart())))
	router.HandlerFunc(http.MethodPatch, "/api/v1/cart/item", rateLimiter.Limit(authmidware(cartHandler.UpdateItemQuantity())))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/checkout", rateLimiter.Limit(authmidware(cartHandler.InitiateCheckout())))

	// Checkout session creation
	router.HandlerFunc(http.MethodPost, "/api/v1/checkout/session", rateLimiter.Limit(authmidware(cartHandler.CreateCheckoutSession())))

	// Order placement
	router.HandlerFunc(http.MethodPost, "/api/v1/order", rateLimiter.Limit(authmidware(cartHandler.PlaceOrder())))
	router.HandlerFunc(http.MethodGet, "/api/v1/order/mine", authmidware(cartHandler.GetMyOrders()))

	router.HandlerFunc(http.MethodPost, "/api/v1/coupon/validate", rateLimiter.Limit(authmidware(cartHandler.ValidateCouponHandler())))

}

func AddStripeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/create-payment-intent", rateLimiter.Limit(authmidware(stripe.CreatePaymentIntent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/payment-success", rateLimiter.Limit(authmidware(stripe.PaymentSuccess(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/webhook", rateLimiter.Limit(authmidware(stripe.StripeWebhook(app))))
}
