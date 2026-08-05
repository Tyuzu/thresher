package beats

import (
	"net/http"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

// GET /api/v1/subscribes/:type/:id
func DoesSubscribeEntity(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		currentUserID := utils.GetUserIDFromRequest(r)
		if currentUserID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		entityID := utils.GetParam(r, "id")
		if entityID == "" {
			http.Error(w, "Entity ID required", http.StatusBadRequest)
			return
		}

		entityType := utils.GetParam(r, "type")

		switch entityType {
		case "user", "artist", "feedpost":
			// allowed
		default:
			http.Error(w, "Invalid entity type", http.StatusBadRequest)
			return
		}

		count, err := app.DB.CountDocuments(
			r.Context(),
			subscribersCollection,
			bson.M{
				"userid": currentUserID,
				"subscribed": bson.M{
					"$in": []string{entityID},
				},
			},
		)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		resp := map[string]bool{
			"hasSubscribed": count > 0,
		}

		utils.RespondWithJSON(w, http.StatusOK, resp)
	}
}

// GET /api/v1/subscribers/:id
func GetSubscribers(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		targetUserID := utils.GetParam(r, "id")
		if targetUserID == "" {
			http.Error(w, "Target user ID required", http.StatusBadRequest)
			return
		}

		var sub models.UserSubscribe
		err := app.DB.FindOne(
			r.Context(),
			subscribersCollection,
			bson.M{"userid": targetUserID},
			&sub,
		)
		if err != nil || len(sub.Subscribers) == 0 {
			utils.RespondWithJSON(w, http.StatusOK, []models.User{})
			return
		}

		var subscribers []models.User
		err = app.DB.FindMany(
			r.Context(),
			usersCollection,
			bson.M{
				"userid": bson.M{
					"$in": sub.Subscribers,
				},
			},
			&subscribers,
		)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, subscribers)
	}
}
