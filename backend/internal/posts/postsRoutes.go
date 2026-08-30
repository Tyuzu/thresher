package posts

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the posts package.

func AddPostRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public read
	router.HandlerFunc(http.MethodGet, "/api/v1/posts/post/:id", rateLimiter.Limit(GetPost(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/posts", rateLimiter.Limit(GetAllPosts(app)))
	// router.HandlerFunc(http.MethodPost,"/api/v1/posts/upload", rateLimiter.Limit(UploadImage))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/posts/post", rateLimiter.Limit(authmidware(CreatePost(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/posts/post/:id", rateLimiter.Limit(authmidware(UpdatePost(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/posts/post/:id", rateLimiter.Limit(authmidware(DeletePost(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/posts/post/:id/related", rateLimiter.Limit(authmidware(GetRelatedPosts(app))))

}
