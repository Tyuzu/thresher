package artists

import (
	"context"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// GetArtistsSongs returns all published songs for an artist.
// If no songs exist, returns an empty array.
func GetArtistsSongs(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		artistID := ps.ByName("id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var songs []models.ArtistSong
		err := FindSongsByArtist(ctx, app.DB, artistID, &songs)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch songs")
			return
		}

		// Ensure we always return an array, not null
		if songs == nil {
			songs = []models.ArtistSong{}
		}

		utils.RespondWithJSON(w, http.StatusOK, songs)
	}
}
