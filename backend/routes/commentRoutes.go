package routes

import (
	"naevis/infra"
	"naevis/internal/comments"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddCommentsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create comment
	router.HandlerFunc(http.MethodPost, "/api/v1/comments/:entitytype/:entityid", rateLimiter.Limit(authmidware(comments.CreateComment(app))))

	// Get comments for an entity (supports pagination/sorting via query params)
	router.HandlerFunc(http.MethodGet, "/api/v1/comments/:entitytype/:entityid", comments.GetComments(app)) // Public

	router.HandlerFunc(http.MethodGet, "/api/v1/comments/:entitytype/:entityid/:commentid", comments.GetComment(app))

	// Update & Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/comments/:entitytype/:entityid/:commentid", rateLimiter.Limit(authmidware(comments.UpdateComment(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/comments/:entitytype/:entityid/:commentid", rateLimiter.Limit(authmidware(comments.DeleteComment(app))))
}
