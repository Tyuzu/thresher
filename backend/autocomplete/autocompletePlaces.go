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
	"go.mongodb.org/mongo-driver/bson"
)

func AutocompletePlaces(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		query := strings.TrimSpace(r.URL.Query().Get("query"))
		if len(query) < 2 {
			utils.RespondWithJSON(w, http.StatusOK, []models.PlaceSuggestion{})
		}

		filter := bson.M{
			"name": bson.M{
				"$regex":   "^" + query,
				"$options": "i",
			},
		}

		var places []models.Place

		err := app.DB.FindMany(
			ctx,
			AutocompleteCollection,
			filter,
			&places,
		)
		if err != nil {
			http.Error(w, "failed to fetch suggestions", http.StatusInternalServerError)
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
