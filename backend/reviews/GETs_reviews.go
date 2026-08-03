package reviews

import (
	"context"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

/* -------------------------
   Get Reviews (list)
------------------------- */

func GetReviews(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		entityType := utils.GetParam(r, "entityType")
		entityId := utils.GetParam(r, "entityId")

		skip, limit := utils.ParsePagination(r, 10, 100)

		filter := bson.M{
			"entitytype": entityType,
			"entityid":   entityId,
		}

		var reviews []models.Review
		if err := app.DB.FindMany(ctx, reviewsCollection, filter, &reviews); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch reviews"})
			return
		}

		utils.SortAndSlice(
			&reviews,
			bson.D{{Key: "createdAt", Value: -1}},
			int64(skip),
			int64(limit),
		)

		if reviews == nil {
			reviews = []models.Review{}
		}

		utils.RespondWithJSON(w, http.StatusOK, reviews)
	}
}

/* -------------------------
   Get Review (single)
------------------------- */

func GetReview(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reviewId := utils.GetParam(r, "reviewId")

		var review models.Review
		if err := app.DB.FindOne(
			r.Context(),
			reviewsCollection,
			bson.M{"reviewid": reviewId},
			&review,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]string{"error": "Review not found"})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, review)
	}
}
