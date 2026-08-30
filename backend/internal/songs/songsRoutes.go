package songs

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

func AddSongsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/songs", rateLimiter.Limit(GetArtistsSongs(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/songs", rateLimiter.Limit(authmidware(PostNewSong(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/songs/:songId/edit", rateLimiter.Limit(authmidware(EditSong(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/songs/:songId", rateLimiter.Limit(authmidware(DeleteSong(app))))

}
