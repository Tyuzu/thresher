package songs

import (
	"context"
	"scav/infra"
	"scav/utils"
	"net/http"
	"time"
)

// GetArtistsSongs returns all published songs for an artist.
// If no songs exist, returns an empty array.
func GetArtistsSongs(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		artistID := utils.GetParam(r, "id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var songs []ArtistSong
		err := FindSongsByArtist(ctx, app.DB, artistID, &songs)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch songs")
			return
		}

		// Ensure we always return an array, not null
		if songs == nil {
			songs = []ArtistSong{}
		}

		utils.RespondWithJSON(w, http.StatusOK, songs)
	}
}
