package comments

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the comments package.

func AddCommentsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create comment
	router.HandlerFunc(http.MethodPost, "/api/v1/comments/:entitytype/:entityid", rateLimiter.Limit(authmidware(CreateComment(app))))

	// Get comments for an entity (supports pagination/sorting via query params)
	router.HandlerFunc(http.MethodGet, "/api/v1/comments/:entitytype/:entityid", GetComments(app)) // Public

	router.HandlerFunc(http.MethodGet, "/api/v1/comments/:entitytype/:entityid/:commentid", GetComment(app))

	// Update & Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/comments/:entitytype/:entityid/:commentid", rateLimiter.Limit(authmidware(UpdateComment(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/comments/:entitytype/:entityid/:commentid", rateLimiter.Limit(authmidware(DeleteComment(app))))
}
