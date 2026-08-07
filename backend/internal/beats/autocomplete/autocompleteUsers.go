package autocomplete

import (
	"context"
	"net/http"
	"strings"
	"time"

	"naevis/infra"
	"naevis/internal/suggestions"
	"naevis/models"
	"naevis/utils"
)

func AutocompleteUsers(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		query := strings.TrimSpace(r.URL.Query().Get("query"))
		if len(query) < 2 {
			utils.RespondWithJSON(w, http.StatusOK, []suggestions.UserSuggestion{})
			return
		}

		var users []models.User

		err := findUsersByQuery(ctx, app.DB, query, &users)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"message": "failed to fetch suggestions"})
			return
		}

		usersSuggestions := make([]suggestions.UserSuggestion, 0, 10)

		for _, user := range users {
			usersSuggestions = append(usersSuggestions, suggestions.UserSuggestion{
				ID:       user.UserID,
				Username: user.Username,
				Avatar:   user.Avatar,
			})

			if len(usersSuggestions) >= 10 {
				break
			}
		}

		utils.RespondWithJSON(w, http.StatusOK, usersSuggestions)
	}
}
