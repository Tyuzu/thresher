package routes

import (
	"naevis/artists"
	"naevis/fanmade"
	"naevis/infra"
	"naevis/middleware"
	"naevis/musicon"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddMusicRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// --------------------------- PLAYLISTS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/user/playlists",
		rateLimiter.Limit(authmidware(musicon.GetUserPlaylists(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/user/liked",
		rateLimiter.Limit(authmidware(musicon.GetUserLikes(app))),
	)

	router.HandlerFunc(http.MethodPost,
		"/api/v1/musicon/playlists",
		rateLimiter.Limit(authmidware(musicon.CreatePlaylist(app))),
	)

	router.HandlerFunc(http.MethodDelete,
		"/api/v1/musicon/playlists/:playlistid",
		rateLimiter.Limit(authmidware(musicon.DeletePlaylist(app))),
	)

	// Add / Remove songs to playlist
	router.HandlerFunc(http.MethodPost,
		"/api/v1/musicon/playlists/:playlistid/songs",
		rateLimiter.Limit(authmidware(musicon.AddSongToPlaylist(app))),
	)

	router.HandlerFunc(http.MethodDelete,
		"/api/v1/musicon/playlists/:playlistid/songs/:songid",
		rateLimiter.Limit(authmidware(musicon.RemoveSongFromPlaylist(app))),
	)

	// Playlist details
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/playlists/:playlistid/songs",
		rateLimiter.Limit(authmidware(musicon.GetPlaylistSongs(app))),
	)

	// Rename / Update playlist info
	router.HandlerFunc(http.MethodPatch,
		"/api/v1/musicon/playlists/:playlistid",
		rateLimiter.Limit(authmidware(musicon.UpdatePlaylistInfo(app))),
	)

	// --------------------------- LIKES ---------------------------

	// Like song (idempotent)
	router.HandlerFunc(http.MethodPost,
		"/api/v1/musicon/user/liked/:songid",
		rateLimiter.Limit(authmidware(musicon.LikeSong(app))),
	)

	// Unlike song (idempotent)
	router.HandlerFunc(http.MethodDelete,
		"/api/v1/musicon/user/liked/:songid",
		rateLimiter.Limit(authmidware(musicon.UnlikeSong(app))),
	)

	// --------------------------- ARTISTS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/artists/:artistid/songs",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetArtistsSongs(app))),
	)

	// --------------------------- ALBUMS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/albums",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbums(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/albums/:albumid/songs",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbumSongs(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/recommended/albums",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedAlbums(app))),
	)

	// --------------------------- SONGS & RECOMMENDATIONS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/recommended",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedSongs(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/recommendations",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendations(app))),
	)
}

/* func AddMusicRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	--------------------------- PLAYLISTS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/user/playlists", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetUserPlaylists(app))))
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/user/liked", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetUserLikes(app))))
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/playlists", rateLimiter.Limit(authmidware(musicon.CreatePlaylist(app))))
	router.HandlerFunc(http.MethodDelete,"/api/v1/musicon/playlists/:playlistid", rateLimiter.Limit(authmidware(musicon.DeletePlaylist(app))))

	Add / Remove songs to playlist
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/playlists/:playlistid/songs/:songid", rateLimiter.Limit(authmidware(musicon.AddSongToPlaylist)))
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/playlists/:playlistid/songs", rateLimiter.Limit(authmidware(musicon.AddSongToPlaylist(app))))
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/user/liked/:songid", rateLimiter.Limit(middleware.OptionalAuth(musicon.SetUserLikes(app))))
	router.HandlerFunc(http.MethodDelete,"/api/v1/musicon/playlists/:playlistid/songs/:songid", rateLimiter.Limit(authmidware(musicon.RemoveSongFromPlaylist(app))))

	Playlist details
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/playlists/:playlistid/songs", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetPlaylistSongs(app))))

	Rename / Update playlist info
	router.HandlerFunc(http.MethodPatch,"/api/v1/musicon/playlists/:playlistid", rateLimiter.Limit(authmidware(musicon.UpdatePlaylistInfo(app))))

	--------------------------- ARTISTS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/artists/:artistid/songs", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetArtistsSongs(app))))

	--------------------------- ALBUMS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/albums", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbums(app))))
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/albums/:albumid/songs", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbumSongs(app))))
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/recommended/albums", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedAlbums(app))))

	--------------------------- SONGS & RECOMMENDATIONS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/recommended", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedSongs(app))))

	Dynamic personalized recommendations
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/recommendations", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendations(app))))
} */

func AddArtistRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public read
	router.HandlerFunc(http.MethodGet, "/api/v1/artists", rateLimiter.Limit(artists.GetAllArtists(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id", rateLimiter.Limit(artists.GetArtistByID(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid/artists", rateLimiter.Limit(artists.GetArtistsByEvent(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/songs", rateLimiter.Limit(artists.GetArtistsSongs(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/albums", rateLimiter.Limit(artists.GetArtistsAlbums(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/posts", rateLimiter.Limit(artists.GetArtistsPosts(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/merch", rateLimiter.Limit(artists.GetArtistsMerch(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/events", rateLimiter.Limit(artists.GetArtistEvents(app)))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/artists", rateLimiter.Limit(authmidware(artists.CreateArtist(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id", rateLimiter.Limit(authmidware(artists.UpdateArtist(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id", rateLimiter.Limit(authmidware(artists.DeleteArtistByID(app))))

	// OLD (bulk update) – optional to keep
	// router.HandlerFunc(http.MethodPut,"/api/v1/artists/:id/members", rateLimiter.Limit(authmidware(artists.UpdateArtistMembers)))

	// NEW — per-member endpoints
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/members",
		rateLimiter.Limit(authmidware(artists.AddArtistMember(app))))

	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/members/:memberId",
		rateLimiter.Limit(authmidware(artists.UpdateArtistMember(app))))

	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/members/:memberId",
		rateLimiter.Limit(authmidware(artists.DeleteArtistMember(app))))

	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/songs", rateLimiter.Limit(authmidware(artists.PostNewSong(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/songs/:songId/edit", rateLimiter.Limit(authmidware(artists.EditSong(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/songs/:songId", rateLimiter.Limit(authmidware(artists.DeleteSong(app))))

	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/events/addtoevent", rateLimiter.Limit(authmidware(artists.AddArtistToEvent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(artists.CreateArtistEvent(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(artists.UpdateArtistEvent(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(artists.DeleteArtistEvent(app))))
}

func AddFanmadeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(fanmade.GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(fanmade.GetMedias(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(authmidware(fanmade.AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(fanmade.EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(fanmade.DeleteMedia(app))))
}
