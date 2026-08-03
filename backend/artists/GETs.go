package artists

import (
	"context"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"naevis/artists/repo"
	aust "naevis/artists/usecase"

	"go.mongodb.org/mongo-driver/bson"
)

// Artist Events
func GetArtistEvents(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		artistevents, err := uc.GetArtistEvents(ctx, utils.GetParam(r, "id"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch artist events")
			return
		}

		if len(artistevents) == 0 {
			artistevents = []models.ArtistEvent{}
		}

		utils.RespondWithJSON(w, http.StatusOK, artistevents)
	}
}
func GetArtistByID(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistId := utils.GetParam(r, "id")

		// Fetch artist info
		artist, err := uc.GetArtistByID(ctx, artistId)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Artist not found")
			return
		}

		// Default: not subscribed
		isSubscribed := false

		// Get current logged-in user ID
		currentUserID := utils.GetUserIDFromRequest(r)
		if currentUserID != "" {
			// Check if the user has subscribed to this artist
			var subscribers []bson.M
			if err := FindSubscribersForArtist(ctx, app.DB, currentUserID, artistId, &subscribers); err == nil && len(subscribers) > 0 {
				isSubscribed = true
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
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		eventID := utils.GetParam(r, "eventid")

		artists, err := uc.GetArtistsByEvent(ctx, eventID)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error fetching artists")
			return
		}

		if len(artists) == 0 {
			artists = []models.Artist{}
		}

		utils.RespondWithJSON(w, http.StatusOK, artists)
	}
}

// All Artists
func GetAllArtists(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		artists, err := uc.GetAllArtists(ctx)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error fetching artists")
			return
		}

		if len(artists) == 0 {
			artists = []models.Artist{}
		}

		utils.RespondWithJSON(w, http.StatusOK, artists)
	}
}
