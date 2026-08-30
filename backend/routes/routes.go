package routes

import (
	"net/http"
	"scav/infra"
	"scav/internal/home"
	"scav/internal/userdata/metadata"
	"scav/middleware"
	"scav/utils"

	"github.com/julienschmidt/httprouter"
)

// func AddStaticRoutes(router *httprouter.Router) {
// 	router.ServeFiles("/static/uploads/*filepath", http.Dir("static/uploads"))
// }

func AddHomeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// router.HandlerFunc(http.MethodGet,"/api/v1/home/:apiRoute", middleware.OptionalAuth(home.GetHomeContent)) // Public/optional
	router.HandlerFunc(http.MethodGet, "/api/v1/homecards", middleware.OptionalAuth(home.HomeCardsHandler(app))) // Public/optional
}

// Routes registration

func AddUtilityRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/csrf", rateLimiter.Limit(authmidware(utils.CSRF)))
}

func AddMiscRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/users/meta", rateLimiter.Limit(metadata.GetUsersMeta(app)))

	// router.HandlerFunc(http.MethodPost,"/api/v1/check-file", rateLimiter.Limit(filecheck.CheckFileExists))
	// router.HandlerFunc(http.MethodPost,"/api/v1/upload", rateLimiter.Limit(filecheck.UploadFile))
	// router.HandlerFunc(http.MethodPost,"/api/v1/feed/remhash", rateLimiter.Limit(filecheck.RemoveUserFile))
	// router.HandlerFunc(http.MethodGet,"/resize/:folder/*filename", cdn.ServeStatic)

}

// ----------------------- ROUTES -----------------------
