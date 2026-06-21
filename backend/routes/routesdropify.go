package routes

import (
	"naevis/dropify/filemgr"
	"naevis/dropify/mediaproxy"
	"naevis/infra"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddStaticRoutes(router *httprouter.Router) {
	// Serve static uploaded files
	router.ServeFiles("/static/uploads/*filepath", http.Dir("static/uploads"))

	// Proxy handler for external media
	router.GET("/static/proxy/*url", mediaproxy.ProxyHandler)
	router.GET("/static/proxy", mediaproxy.ProxyHandler)
}

func AddFiledropRoutes(
	router *httprouter.Router,
	app *infra.Deps,
	rateLimiter *middleware.RateLimiter,
) {
	authmidware := middleware.Authenticate(app)
	router.POST(
		"/api/v1/filedrop",
		rateLimiter.Limit(authmidware(filemgr.FiledropHandler(app))),
	)

	router.OPTIONS(
		"/api/v1/filedrop",
		filemgr.OptionsHandler,
	)
}
