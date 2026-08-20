package routes

import (
	"naevis/infra"
	"naevis/internal/beats/activity"
	"naevis/internal/beats/ads"
	"naevis/internal/beats/analytics"
	"naevis/internal/beats/autocomplete"
	"naevis/internal/beats/follows"
	"naevis/internal/beats/hashtags"
	"naevis/internal/beats/likes"
	"naevis/internal/beats/subscribe"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddBeatRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {

	authmidware := middleware.Authenticate(app)

	// Like
	router.HandlerFunc(http.MethodPut, "/api/v1/likes/:entitytype/:entityid", rateLimiter.Limit(authmidware(likes.LikeEntity(app))))

	// Unlike
	router.HandlerFunc(http.MethodDelete, "/api/v1/likes/:entitytype/:entityid", rateLimiter.Limit(authmidware(likes.UnlikeEntity(app))))

	// Check whether the current user liked the entity
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/:entityid", rateLimiter.Limit(authmidware(likes.GetUserLike(app))))

	// Public like count
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/:entityid/count", rateLimiter.Limit(likes.GetLikeCount(app)))

	// Public likers
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/:entityid/users", rateLimiter.Limit(likes.GetLikers(app)))

	// Batch current-user likes
	router.HandlerFunc(http.MethodPost, "/api/v1/likes/:entitytype/batch/users", rateLimiter.Limit(authmidware(likes.BatchUserLikes(app))))

	// Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(follows.ToggleFollow(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(follows.ToggleUnFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/follows/:id/status", rateLimiter.Limit(authmidware(follows.DoesFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/followers/:id", rateLimiter.Limit(follows.GetFollowers(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/following/:id", rateLimiter.Limit(follows.GetFollowing(app)))

	// Subscribes / Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(subscribe.SubscribeEntity(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(subscribe.UnsubscribeEntity(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(subscribe.DoesSubscribeEntity(app))))

	// Get all subscribers of a user/artist
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribers/:id", rateLimiter.Limit(subscribe.GetSubscribers(app)))

}

func AddActivityRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// If activity log/feed is user-specific, keep auth
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/activity/log", rateLimiter.Limit(authmidware(activity.LogActivities(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/activity/get", authmidware(activity.GetActivityFeed(app)))

	// Public analytics/telemetry ingestion
	router.HandlerFunc(http.MethodPost, "/api/v1/scitylana/event", activity.HandleAnalyticsEvent(app))
}

func AddAnalyticsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/antics/:entityType/:entityId", rateLimiter.Limit(analytics.GetEntityAnalytics))
}

func AddAutocompleteRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/ac/places", rateLimiter.Limit(autocomplete.AutocompletePlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/ac/users", rateLimiter.Limit(autocomplete.AutocompleteUsers(app)))
}

func AddAdsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public Serving & Analytics Endpoints
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/sda", rateLimiter.Limit(middleware.OptionalAuth(ads.GetAds(app))))
	router.HandlerFunc(http.MethodOptions, "/api/v1/sda/sda", middleware.OptionalAuth(ads.GetAds(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/sda/track-impression", rateLimiter.Limit(middleware.OptionalAuth(ads.TrackImpression(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/track-impression", rateLimiter.Limit(middleware.OptionalAuth(ads.TrackImpression(app))))
	router.HandlerFunc(http.MethodOptions, "/api/v1/sda/track-impression", middleware.OptionalAuth(ads.TrackImpression(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/sda/track-click", rateLimiter.Limit(middleware.OptionalAuth(ads.TrackClick(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/track-click", rateLimiter.Limit(middleware.OptionalAuth(ads.TrackClick(app))))
	router.HandlerFunc(http.MethodOptions, "/api/v1/sda/track-click", middleware.OptionalAuth(ads.TrackClick(app)))

	// Admin / Management CRUD Routes (Require Auth)
	router.HandlerFunc(http.MethodPost, "/api/v1/admin/ads", authmidware(ads.CreateAd(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/admin/ads/promote-post", authmidware(ads.PromotePostToAd(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/admin/ads", authmidware(ads.ListAds(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/admin/ads/:id", authmidware(ads.GetAdByID(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/admin/ads/:id", authmidware(ads.UpdateAd(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/admin/ads/:id", authmidware(ads.DeleteAd(app)))
}

func AddHashtagRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag", hashtags.GetHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/top", hashtags.GetTopHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/latest", hashtags.GetLatestHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/people", hashtags.GetHashtagPeople)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtags/trending", hashtags.GetTrendingHashtags)

	// router.HandlerFunc(http.MethodGet,"/api/v1/hashtags/hashtag/:tag", hashtags.GetHashtagPosts)
	// router.HandlerFunc(http.MethodGet,"/api/v1/hashtags/hashtags/trending", hashtags.GetTrendingHashtags)
}
