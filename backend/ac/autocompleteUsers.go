package ac

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/infra"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func AutocompleteUsers(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		query := strings.TrimSpace(r.URL.Query().Get("query"))
		if len(query) < 2 {
			_ = json.NewEncoder(w).Encode([]models.UserSuggestion{})
			return
		}

		filter := bson.M{
			"username": bson.M{
				"$regex":   "^" + query,
				"$options": "i",
			},
		}

		var users []models.User

		err := app.DB.FindMany(
			ctx,
			AutocompleteCollection,
			filter,
			&users,
		)
		if err != nil {
			http.Error(w, "failed to fetch suggestions", http.StatusInternalServerError)
			return
		}

		suggestions := make([]models.UserSuggestion, 0, 10)

		for _, user := range users {
			suggestions = append(suggestions, models.UserSuggestion{
				ID:       user.UserID,
				Username: user.Username,
				Avatar:   user.Avatar,
			})

			if len(suggestions) >= 10 {
				break
			}
		}

		_ = json.NewEncoder(w).Encode(suggestions)
	}
}
