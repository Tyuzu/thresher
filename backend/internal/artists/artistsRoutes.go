package artists

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

func AddArtistRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public read
	router.HandlerFunc(http.MethodGet, "/api/v1/artists", rateLimiter.Limit(GetAllArtists(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id", rateLimiter.Limit(GetArtistByID(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid/artists", rateLimiter.Limit(GetArtistsByEvent(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/albums", rateLimiter.Limit(GetArtistsAlbums(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/posts", rateLimiter.Limit(GetArtistsPosts(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/merch", rateLimiter.Limit(GetArtistsMerch(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/events", rateLimiter.Limit(GetArtistEvents(app)))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/artists", rateLimiter.Limit(authmidware(CreateArtist(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id", rateLimiter.Limit(authmidware(UpdateArtist(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id", rateLimiter.Limit(authmidware(DeleteArtistByID(app))))

	// OLD (bulk update) – optional to keep
	// router.HandlerFunc(http.MethodPut,"/api/v1/artists/:id/members", rateLimiter.Limit(authmidware(UpdateArtistMembers)))

	// NEW — per-member endpoints
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/members", rateLimiter.Limit(authmidware(AddArtistMember(app))))

	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/members/:memberId", rateLimiter.Limit(authmidware(UpdateArtistMember(app))))

	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/members/:memberId", rateLimiter.Limit(authmidware(DeleteArtistMember(app))))

	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/events/addtoevent", rateLimiter.Limit(authmidware(AddArtistToEvent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(CreateArtistEvent(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(UpdateArtistEvent(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(DeleteArtistEvent(app))))
}
