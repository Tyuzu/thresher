package autocomplete

import (
	"context"
	"net/http"
	"strings"
	"time"

	"scav/infra"
	"scav/internal/beats/suggestions"
	"scav/internal/places"
	"scav/utils"
)

func AutocompletePlaces(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		query := strings.TrimSpace(r.URL.Query().Get("query"))
		if len(query) < 2 {
			utils.RespondWithJSON(w, http.StatusOK, []suggestions.PlaceSuggestion{})
			return
		}

		var places []places.Place

		err := findPlacesByQuery(ctx, app.DB, query, &places)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"message": "failed to fetch suggestions"})
			return
		}

		placeSuggestions := make([]suggestions.PlaceSuggestion, 0, 10)

		for _, place := range places {
			placeSuggestions = append(placeSuggestions, suggestions.PlaceSuggestion{
				ID:       place.PlaceID,
				Name:     place.Name,
				Banner:   place.Banner,
				Category: place.Category,
			})

			if len(placeSuggestions) >= 10 {
				break
			}
		}

		utils.RespondWithJSON(w, http.StatusOK, placeSuggestions)
	}
}
