package routes

import (
	"net/http"

	"scav/infra"
	"scav/internal/filemgr"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

func AddStaticRoutes(router *httprouter.Router) {
	// Serve static uploaded files directly using standard file server
	router.ServeFiles("/static/uploads/*filepath", http.Dir("static/uploads"))

	// Proxy handler for external media supporting both query parameter & wildcard paths
	router.HandlerFunc(http.MethodGet, "/static/proxy/*url", filemgr.ProxyHandler)
	router.HandlerFunc(http.MethodGet, "/static/proxy", filemgr.ProxyHandler)
}

func AddFiledropRoutes(
	router *httprouter.Router,
	app *infra.Deps,
	rateLimiter *middleware.RateLimiter,
) {
	authMid := middleware.Authenticate(app)

	// Combine middleware: Rate Limit -> Auth
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
