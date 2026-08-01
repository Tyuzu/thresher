package routes

import (
	"net/http"

	"naevis/filemgr"
	"naevis/infra"
	"naevis/middleware"

	"github.com/julienschmidt/httprouter"
)

func AddStaticRoutes(router *httprouter.Router) {
	// Serve static uploaded files using standard http.FileServer
	router.ServeFiles("/static/uploads/*filepath", http.Dir("static/uploads"))

	// Proxy handler for external media using standard HandlerFunc
	router.HandlerFunc(http.MethodGet, "/static/proxy/*url", filemgr.ProxyHandler)
	router.HandlerFunc(http.MethodGet, "/static/proxy", filemgr.ProxyHandler)
}

func AddFiledropRoutes(
	router *httprouter.Router,
	app *infra.Deps,
	rateLimiter *middleware.RateLimiter,
) {
	authMid := middleware.Authenticate(app)

	// Combine middleware: Rate Limit -> Auth -> Handler
	filedropChain := middleware.Chain(
		rateLimiter.Limit,
		authMid,
	)

	// Main filedrop upload route
	router.HandlerFunc(
		http.MethodPost,
		"/api/v1/filedrop",
		filedropChain(filemgr.FiledropHandler(app)),
	)

	// CORS Preflight handler
	router.HandlerFunc(
		http.MethodOptions,
		"/api/v1/filedrop",
		filemgr.OptionsHandler,
	)
}
