package places

import (
	"context"
	"net/http"
	"strings"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"naevis/places/repo"
	pu "naevis/places/usecase"
)

// --- Get all places (summary) ---
func GetPlaces(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		repoImpl := repo.NewMongoRepo(app.DB)
		uc := pu.NewPlacesUsecase(repoImpl)

		places, err := uc.ListPlaces(ctx, map[string]any{})
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch places")
			return
		}

		var result []models.PlacesResponse
		for _, p := range places {
			desc := p.Description
			if len(desc) > 60 {
				desc = desc[:60] + "..."
			}

			tags := p.Tags
			if len(tags) > 5 {
				tags = tags[:5]
			}

			result = append(result, models.PlacesResponse{
				PlaceID:        p.PlaceID,
				Name:           p.Name,
				ShortDesc:      desc,
				Address:        p.Address,
				Distance:       p.Distance,
				OperatingHours: p.OperatingHours,
				Category:       p.Category,
				Tags:           tags,
				Banner:         p.Banner,
			})
		}

		utils.RespondWithJSON(w, http.StatusOK, result)
	}
}

// --- Get single place by path param ---
func GetPlace(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := pu.NewPlacesUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		placeID := strings.TrimSpace(utils.GetParam(r, "placeid"))
		if placeID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Place ID is required")
			return
		}

		place, err := uc.GetPlace(r.Context(), placeID)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Place not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, place)
	}
}

// --- Get single place by query param ---
func GetPlaceQ(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := pu.NewPlacesUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		placeID := strings.TrimSpace(r.URL.Query().Get("id"))
		if placeID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Place ID is required")
			return
		}

		place, err := uc.GetPlace(r.Context(), placeID)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Place not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, place)
	}
}
