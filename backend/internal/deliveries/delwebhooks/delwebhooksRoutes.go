package delwebhooks

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the delwebhooks package.

func AddDelWebhookRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	protected := func(h http.HandlerFunc) http.HandlerFunc {
		return rateLimiter.Limit(authmidware(h))
	}

	// WEBHOOKS
	router.HandlerFunc(http.MethodPost, "/api/v1/webhooks", protected(CreateWebhook(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/webhooks", protected(ListWebhooks(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/webhooks/:webhookid", protected(GetWebhook(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/webhooks/:webhookid", protected(UpdateWebhook(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/webhooks/:webhookid", protected(DeleteWebhook(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/webhooks/:webhookid/test", protected(TestWebhook(app)))
}
