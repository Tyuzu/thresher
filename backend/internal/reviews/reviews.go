package reviews

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"scav/config"
	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"

	"go.mongodb.org/mongo-driver/bson"
)

/* -------------------------
   Helpers
------------------------- */

func getUserID(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(config.UserIDKey).(string)
	return id, ok && id != ""
}

func isAdmin(ctx context.Context) bool {
	role, ok := ctx.Value("role").(string)
	return ok && role == "admin"
}

/* -------------------------
   Payloads
------------------------- */

type CreateReviewPayload struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type UpdateReviewPayload struct {
	Rating  *int   `json:"rating,omitempty"`
	Comment string `json:"comment,omitempty"`
}

/* -------------------------
   Add Review
------------------------- */

func AddReview(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userId, ok := getUserID(r.Context())
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}

		entityType := utils.GetParam(r, "entityType")
		entityId := utils.GetParam(r, "entityId")

		dupFilter := bson.M{
			"userid":     userId,
			"entityType": entityType,
			"entityId":   entityId,
		}

		var existing Review
		if err := app.DB.FindOne(r.Context(), reviewsCollection, dupFilter, &existing); err == nil {
			utils.RespondWithJSON(w, http.StatusConflict, map[string]string{"error": "Already reviewed"})
			return
		}

		var payload CreateReviewPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
			return
		}

		if payload.Rating < 1 || payload.Rating > 5 || payload.Comment == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid review data"})
			return
		}

		now := time.Now().UTC()
		review := Review{
			ReviewID:   utils.GenerateRandomString(16),
			UserID:     userId,
			EntityType: entityType,
			EntityID:   entityId,
			Rating:     payload.Rating,
			Comment:    payload.Comment,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		if err := app.DB.Insert(r.Context(), reviewsCollection, review); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create review"})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ReviewCreatedPayload{})
		mq.PublishWithMeta(ctx, app.MQ, mqevent.ReviewCreatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, review)
	}
}

/* -------------------------
   Edit Review
------------------------- */

func EditReview(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userId, ok := getUserID(r.Context())
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}

		reviewId := utils.GetParam(r, "reviewId")

		var existing Review
		if err := app.DB.FindOne(
			r.Context(),
			reviewsCollection,
			bson.M{"reviewid": reviewId},
			&existing,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]string{"error": "Review not found"})
			return
		}

		if existing.UserID != userId && !isAdmin(r.Context()) {
			utils.RespondWithJSON(w, http.StatusForbidden, map[string]string{"error": "Forbidden"})
			return
		}

		var payload UpdateReviewPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
			return
		}

		update := bson.M{
			"updatedAt": time.Now().UTC(),
		}

		if payload.Rating != nil {
			if *payload.Rating < 1 || *payload.Rating > 5 {
				utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid rating"})
				return
			}
			update["rating"] = *payload.Rating
		}

		if payload.Comment != "" {
			update["comment"] = payload.Comment
		}

		if len(update) == 1 {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Nothing to update"})
			return
		}

		if _, err := app.DB.Update(
			r.Context(),
			reviewsCollection,
			bson.M{"reviewid": reviewId},
			update,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update review"})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ReviewUpdatedPayload{})
		mq.PublishWithMeta(ctx, app.MQ, mqevent.ReviewUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Review updated"})
	}
}

/* -------------------------
   Delete Review
------------------------- */

func DeleteReview(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userId, ok := getUserID(r.Context())
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}

		reviewId := utils.GetParam(r, "reviewId")

		var review Review
		if err := app.DB.FindOne(
			r.Context(),
			reviewsCollection,
			bson.M{"reviewid": reviewId},
			&review,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]string{"error": "Review not found"})
			return
		}

		if review.UserID != userId && !isAdmin(r.Context()) {
			utils.RespondWithJSON(w, http.StatusForbidden, map[string]string{"error": "Forbidden"})
			return
		}

		if _, err := app.DB.Delete(
			r.Context(),
			reviewsCollection,
			bson.M{"reviewid": reviewId},
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete review"})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ReviewDeletedPayload{})
		mq.PublishWithMeta(ctx, app.MQ, mqevent.ReviewDeletedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Review deleted"})
	}
}
