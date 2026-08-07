package artists

import (
	"context"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/utils"
)

// Artist Events
func GetArtistEvents(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var artistevents []ArtistEvent
		err := FindArtistEvents(ctx, app.DB, utils.GetParam(r, "id"), &artistevents)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch artist events")
			return
		}

		if len(artistevents) == 0 {
			artistevents = []ArtistEvent{}
		}

		utils.RespondWithJSON(w, http.StatusOK, artistevents)
	}
}

func GetArtistByID(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		artistId := utils.GetParam(r, "id")
		var artist Artist

		// Fetch artist info
		if err := FindArtistByID(ctx, app.DB, artistId, &artist); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Artist not found")
			return
		}

		// Default: not subscribed
		isSubscribed := false

		// Get current logged-in user ID
		currentUserID := utils.GetUserIDFromRequest(r)
		if currentUserID != "" {
			// Check if the user has subscribed to this artist
			subscribed, err := FindSubscribersForArtist(ctx, app.DB, currentUserID, artistId)
			if err == nil {
				isSubscribed = subscribed
			}
		}

		// Response struct: embed artist + subscription info
		resp := ArtistByIDResponse{
			Artist:       artist,
			IsSubscribed: isSubscribed,
		}

		utils.RespondWithJSON(w, http.StatusOK, resp)
	}
}

func GetArtistsByEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		eventID := utils.GetParam(r, "eventid")

		var artists []Artist
		err := FindArtistsByEventID(ctx, app.DB, eventID, &artists)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error fetching artists")
			return
		}

		if len(artists) == 0 {
			artists = []Artist{}
		}

		utils.RespondWithJSON(w, http.StatusOK, artists)
	}
}

// All Artists
func GetAllArtists(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var artists []Artist
		err := FindAllArtists(ctx, app.DB, &artists)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error fetching artists")
			return
		}

		if len(artists) == 0 {
			artists = []Artist{}
		}

		utils.RespondWithJSON(w, http.StatusOK, artists)
	}
}
