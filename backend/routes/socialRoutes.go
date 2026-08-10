package routes

import (
	"naevis/infra"
	"naevis/internal/feed"
	"naevis/internal/media"
	"naevis/internal/media/fanmade"
	"naevis/internal/posts"
	"naevis/internal/reviews"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddReviewsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public view, but rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/reviews/:entityType/:entityId", rateLimiter.Limit(reviews.GetReviews(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(reviews.GetReview(app)))

	// Authenticated actions
	router.HandlerFunc(http.MethodPost, "/api/v1/reviews/:entityType/:entityId", rateLimiter.Limit(authmidware(reviews.AddReview(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(authmidware(reviews.EditReview(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(authmidware(reviews.DeleteReview(app))))
}

func AddMediaRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public view, but rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(media.GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/media/:entitytype/:entityid", rateLimiter.Limit(media.GetMedias(app)))

	// Authenticated actions
	router.HandlerFunc(http.MethodPost, "/api/v1/media/:entitytype/:entityid", rateLimiter.Limit(authmidware(media.AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(media.EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(media.DeleteMedia(app))))
}

func AddFanmadeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(fanmade.GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(fanmade.GetMedias(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(authmidware(fanmade.AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(fanmade.EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(fanmade.DeleteMedia(app))))
}

func AddPostRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public read
	router.HandlerFunc(http.MethodGet, "/api/v1/posts/post/:id", rateLimiter.Limit(posts.GetPost(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/posts", rateLimiter.Limit(posts.GetAllPosts(app)))
	// router.HandlerFunc(http.MethodPost,"/api/v1/posts/upload", rateLimiter.Limit(posts.UploadImage))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/posts/post", rateLimiter.Limit(authmidware(posts.CreatePost(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/posts/post/:id", rateLimiter.Limit(authmidware(posts.UpdatePost(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/posts/post/:id", rateLimiter.Limit(authmidware(posts.DeletePost(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/posts/post/:id/related", rateLimiter.Limit(authmidware(posts.GetRelatedPosts(app))))

}

func AddFeedRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public viewing
	router.HandlerFunc(http.MethodGet, "/api/v1/feed/post/:postid", rateLimiter.Limit(feed.GetPost(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/feed/feed/metadata", rateLimiter.Limit(feed.GetPostsMetadata(app)))

	// Authenticated feed actions
	router.HandlerFunc(http.MethodGet, "/api/v1/feed/feed", rateLimiter.Limit(authmidware(feed.GetPosts(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/feed/media/:entityType/:entityId", rateLimiter.Limit(authmidware(feed.GetPosts(app))))

	router.HandlerFunc(http.MethodPost, "/api/v1/feed/post", rateLimiter.Limit(authmidware(feed.CreateFeedPost(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/feed/post/:postid", rateLimiter.Limit(authmidware(feed.DeletePost(app))))

	// NEW
	router.HandlerFunc(http.MethodPatch, "/api/v1/feed/post/:postid", rateLimiter.Limit(authmidware(feed.EditPost(app))))
	// router.HandlerFunc(http.MethodPost,"/api/v1/feed/post/:postid/subtitles/:lang", rateLimiter.Limit(authmidware(filedrop.UploadSubtitle)))
}
