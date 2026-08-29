package likes

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"scav/infra"
	"scav/utils"
)

func BatchUserLikes(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(
				w,
				"Unauthorized: user not found",
				http.StatusUnauthorized,
			)
			return
		}

		entityType := utils.GetParam(r, "entitytype")

		if !IsValidEntityType(entityType) {
			http.Error(
				w,
				"Invalid entity type",
				http.StatusBadRequest,
			)
			return
		}

		var req struct {
			EntityIDs []string `json:"entity_ids"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(
				w,
				"Bad Request",
				http.StatusBadRequest,
			)
			return
		}

		if len(req.EntityIDs) == 0 {
			utils.RespondWithJSON(
				w,
				http.StatusOK,
				map[string]any{
					"data": map[string]bool{},
				},
			)
			return
		}

		// Don't allow arbitrarily huge $in queries.
		if len(req.EntityIDs) > 100 {
			http.Error(
				w,
				"Maximum 100 entity IDs allowed",
				http.StatusBadRequest,
			)
			return
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			3*time.Second,
		)
		defer cancel()

		var likes []Like

		err := app.DB.FindMany(
			ctx,
			likesCollection,
			bson.M{
				"user_id":     userID,
				"entity_type": entityType,
				"entity_id": bson.M{
					"$in": req.EntityIDs,
				},
			},
			&likes,
		)

		if err != nil {
			http.Error(
				w,
				"Failed to query likes",
				http.StatusInternalServerError,
			)
			return
		}

		likedSet := make(map[string]struct{}, len(likes))

		for _, like := range likes {
			likedSet[like.EntityID] = struct{}{}
		}

		result := make(map[string]bool, len(req.EntityIDs))

		for _, entityID := range req.EntityIDs {
			_, liked := likedSet[entityID]
			result[entityID] = liked
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]any{
				"data": result,
			},
		)
	}
}
