package routes

import (
	"naevis/deliveries"
	"naevis/infra"
	"naevis/middleware"

	"github.com/julienschmidt/httprouter"
)

func AddDeliveryRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	router.GET("/api/v1/deliveries", rateLimiter.Limit(authmidware(deliveries.GetMyDeliveries(app))))
	router.GET("/api/v1/deliveries/:deliveryid", rateLimiter.Limit(authmidware(deliveries.GetDeliveryByID(app))))
}
