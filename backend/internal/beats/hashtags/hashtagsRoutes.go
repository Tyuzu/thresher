package hashtags

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the hashtags package.

func AddHashtagRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag", GetHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/top", GetTopHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/latest", GetLatestHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/people", GetHashtagPeople)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtags/trending", GetTrendingHashtags)

	// router.HandlerFunc(http.MethodGet,"/api/v1/hashtags/hashtag/:tag", GetHashtagPosts)
	// router.HandlerFunc(http.MethodGet,"/api/v1/hashtags/hashtags/trending", GetTrendingHashtags)
}
