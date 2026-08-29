package artists

import (
	"net/http"

	"scav/infra"
	"scav/internal/media"
	"scav/internal/merch"
	"scav/utils"
)

func GetArtistsAlbums(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistID := utils.GetParam(r, "id")

		var albums []ArtistAlbum
		err := app.DB.FindMany(ctx, ArtistAlbumsCollection, map[string]any{"artistid": artistID}, &albums)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve artist albums")
			return
		}

		if albums == nil {
			albums = []ArtistAlbum{}
		}

		utils.RespondWithJSON(w, http.StatusOK, albums)
	}
}

func GetArtistsPosts(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		media.GetMedias(app)(w, r)
	}
}

func GetArtistsMerch(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		merch.GetMerchs(app)(w, r)
	}
}
