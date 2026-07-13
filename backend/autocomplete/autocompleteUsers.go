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

func AutocompleteUsers(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json")

		query := strings.TrimSpace(r.URL.Query().Get("query"))
		if len(query) < 2 {
			utils.RespondWithJSON(w, http.StatusOK, []models.UserSuggestion{})
			return
		}

		var users []models.User

		err := findUsersByQuery(ctx, app.DB, query, &users)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"message": "failed to fetch suggestions"})
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

		utils.RespondWithJSON(w, http.StatusOK, suggestions)
	}
}
