package farms

import (
	"context"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func GetMyFarms(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		skip, limit := utils.ParsePagination(r, 10, 100)

		pipeline := []any{
			bson.M{
				"$match": bson.M{
					"createdby": userID,
				},
			},
			bson.M{
				"$sort": bson.M{
					"createdat": -1,
				},
			},
			bson.M{
				"$lookup": bson.M{
					"from":         "crops",
					"localfield":   "farmid",
					"foreignfield": "farmid",
					"as":           "crops",
				},
			},
			bson.M{"$skip": skip},
			bson.M{"$limit": limit},
		}

		var farms []models.Farm

		if err := app.DB.Aggregate(
			ctx,
			farmsCollection,
			pipeline,
			&farms,
		); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Error fetching farms",
			)
			return
		}

		total, _ := app.DB.CountDocuments(
			ctx,
			farmsCollection,
			bson.M{
				"createdby": userID,
			},
		)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"farms":   farms,
			"total":   total,
			"page":    skip/limit + 1,
			"limit":   limit,
		})
	}
}
