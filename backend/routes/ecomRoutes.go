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

func AddStripeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/create-payment-intent", rateLimiter.Limit(authmidware(stripe.CreatePaymentIntent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/payment-success", rateLimiter.Limit(authmidware(stripe.PaymentSuccess(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/webhook", rateLimiter.Limit(authmidware(stripe.StripeWebhook(app))))
}
