package reports

import (
	"encoding/json"
	"naevis/infra"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func SetUserRole(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		userID := stringTrim(ps.ByName("id"))
		if userID == "" {
			writeError(w, "Missing user ID", http.StatusBadRequest)
			return
		}

		var payload struct {
			Role string `json:"role"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		payload.Role = strings.ToLower(stringTrim(payload.Role))

		allowedRoles := map[string]struct{}{
			"user":      {},
			"moderator": {},
			"admin":     {},
		}

		if _, ok := allowedRoles[payload.Role]; !ok {
			writeError(w, "Invalid role", http.StatusBadRequest)
			return
		}

		var user bson.M
		if err := app.DB.FindOne(
			ctx,
			usersCollection,
			bson.M{"userid": userID},
			&user,
		); err != nil {
			writeError(w, "User not found", http.StatusNotFound)
			return
		}

		if err := app.DB.Update(
			ctx,
			usersCollection,
			bson.M{"userid": userID},
			bson.M{
				"$set": bson.M{
					"role":      []string{payload.Role},
					"updatedAt": time.Now().UTC(),
				},
			},
		); err != nil {
			writeError(w, "Failed to update role", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"message": "Role updated successfully",
			"userId":  userID,
			"role":    payload.Role,
		})
	}
}
