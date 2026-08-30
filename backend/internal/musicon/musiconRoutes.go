package musicon

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the musicon package.

func AddMusicRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// --------------------------- PLAYLISTS ---------------------------
	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/user/playlists", rateLimiter.Limit(authmidware(GetUserPlaylists(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/user/liked", rateLimiter.Limit(authmidware(GetUserLikes(app))))

	router.HandlerFunc(http.MethodPost, "/api/v1/musicon/playlists", rateLimiter.Limit(authmidware(CreatePlaylist(app))))

	router.HandlerFunc(http.MethodDelete, "/api/v1/musicon/playlists/:playlistid", rateLimiter.Limit(authmidware(DeletePlaylist(app))))

	// Add / Remove songs to playlist
	router.HandlerFunc(http.MethodPost, "/api/v1/musicon/playlists/:playlistid/songs", rateLimiter.Limit(authmidware(AddSongToPlaylist(app))))

	router.HandlerFunc(http.MethodDelete, "/api/v1/musicon/playlists/:playlistid/songs/:songid", rateLimiter.Limit(authmidware(RemoveSongFromPlaylist(app))))

	// Playlist details
	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/playlists/:playlistid/songs", rateLimiter.Limit(authmidware(GetPlaylistSongs(app))))

	// Rename / Update playlist info
	router.HandlerFunc(http.MethodPatch, "/api/v1/musicon/playlists/:playlistid", rateLimiter.Limit(authmidware(UpdatePlaylistInfo(app))))

	// --------------------------- LIKES ---------------------------

	// Like song (idempotent)
	router.HandlerFunc(http.MethodPost, "/api/v1/musicon/user/liked/:songid", rateLimiter.Limit(authmidware(LikeSong(app))))

	// Unlike song (idempotent)
	router.HandlerFunc(http.MethodDelete, "/api/v1/musicon/user/liked/:songid", rateLimiter.Limit(authmidware(UnlikeSong(app))))

	// --------------------------- ARTISTS ---------------------------
	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/artists/:artistid/songs", rateLimiter.Limit(middleware.OptionalAuth(GetArtistsSongs(app))))

	// --------------------------- ALBUMS ---------------------------
	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/albums", rateLimiter.Limit(middleware.OptionalAuth(GetAlbums(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/albums/:albumid/songs", rateLimiter.Limit(middleware.OptionalAuth(GetAlbumSongs(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/recommended/albums", rateLimiter.Limit(middleware.OptionalAuth(GetRecommendedAlbums(app))))

	// --------------------------- SONGS & RECOMMENDATIONS ---------------------------
	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/recommended", rateLimiter.Limit(middleware.OptionalAuth(GetRecommendedSongs(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/musicon/recommendations", rateLimiter.Limit(middleware.OptionalAuth(GetRecommendations(app))))
}
