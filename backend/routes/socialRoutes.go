package routes

import (
	"naevis/beats"
	"naevis/comments"
	"naevis/feed"
	"naevis/infra"
	"naevis/middleware"
	"naevis/notices"
	"naevis/reviews"
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

func AddBeatRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// User must be logged in to like/unlike
	router.HandlerFunc(http.MethodPut, "/api/v1/likes/:entitytype/like/:entityid", rateLimiter.Limit(authmidware(beats.ToggleLike(app))))

	// Get users who liked a post/beat
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/users/:entityid", rateLimiter.Limit(authmidware(beats.GetLikers(app))))

	// Batch check user likes
	router.HandlerFunc(http.MethodPost, "/api/v1/likes/:entitytype/batch/users", rateLimiter.Limit(authmidware(beats.BatchUserLikes(app))))

	// Like count is public
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/count/:entityid", rateLimiter.Limit(beats.GetLikeCount(app)))

	// Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(beats.ToggleFollow(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(beats.ToggleUnFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/follows/:id/status", rateLimiter.Limit(authmidware(beats.DoesFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/followers/:id", rateLimiter.Limit(beats.GetFollowers(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/following/:id", rateLimiter.Limit(beats.GetFollowing(app)))

	// Subscribes / Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(beats.SubscribeEntity(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(beats.UnsubscribeEntity(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(beats.DoesSubscribeEntity(app))))

	// Get all subscribers of a user/artist
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribers/:id", rateLimiter.Limit(beats.GetSubscribers(app)))

}

// Routes registration
func AddNoticesRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// CREATE
	router.HandlerFunc(http.MethodPost, "/api/v1/notices/:entitytype/:entityid", rateLimiter.Limit(authmidware(notices.CreateNotice(app))))

	// READ
	router.HandlerFunc(http.MethodGet, "/api/v1/notices/:entitytype/:entityid", notices.GetNotices(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/notices/:entitytype/:entityid/:noticeid", notices.GetNotice(app))

	// UPDATE + DELETE
	router.HandlerFunc(http.MethodPut, "/api/v1/notices/:entitytype/:entityid/:noticeid", rateLimiter.Limit(authmidware(notices.UpdateNotice(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/notices/:entitytype/:entityid/:noticeid", rateLimiter.Limit(authmidware(notices.DeleteNotice(app))))
}

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
