package likes

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the likes package.

func AddLikesRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {

	authmidware := middleware.Authenticate(app)

	// Like
	router.HandlerFunc(http.MethodPut, "/api/v1/likes/:entitytype/:entityid", rateLimiter.Limit(authmidware(LikeEntity(app))))

	// Unlike
	router.HandlerFunc(http.MethodDelete, "/api/v1/likes/:entitytype/:entityid", rateLimiter.Limit(authmidware(UnlikeEntity(app))))

	// Check whether the current user liked the entity
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/:entityid", rateLimiter.Limit(authmidware(GetUserLike(app))))

	// Public like count
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/:entityid/count", rateLimiter.Limit(GetLikeCount(app)))

	// Public likers
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/:entityid/users", rateLimiter.Limit(GetLikers(app)))

	// Batch current-user likes
	router.HandlerFunc(http.MethodPost, "/api/v1/likes/:entitytype/batch/users", rateLimiter.Limit(authmidware(BatchUserLikes(app))))
}
