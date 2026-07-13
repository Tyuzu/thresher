package autocomplete

import (
	"context"
	"net/http"
	"strings"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

func AutocompletePlaces(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		query := strings.TrimSpace(r.URL.Query().Get("query"))
		if len(query) < 2 {
			utils.RespondWithJSON(w, http.StatusOK, []models.PlaceSuggestion{})
			return
		}

		var places []models.Place

		err := findPlacesByQuery(ctx, app.DB, query, &places)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"message": "failed to fetch suggestions"})
			return
		}

		suggestions := make([]models.PlaceSuggestion, 0, 10)

		for _, place := range places {
			suggestions = append(suggestions, models.PlaceSuggestion{
				ID:       place.PlaceID,
				Name:     place.Name,
				Banner:   place.Banner,
				Category: place.Category,
			})

			if len(suggestions) >= 10 {
				break
			}
		}

		utils.RespondWithJSON(w, http.StatusOK, suggestions)
	}
}
