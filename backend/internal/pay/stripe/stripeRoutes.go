package stripe

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the stripe package.

func AddStripeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/create-payment-intent", rateLimiter.Limit(authmidware(CreatePaymentIntent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/payment-success", rateLimiter.Limit(authmidware(PaymentSuccess(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/webhook", rateLimiter.Limit(authmidware(StripeWebhook(app))))
}
