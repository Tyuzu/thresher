package faqs

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
)

/* =========================
   HELPERS
========================= */

func isValidEntityType(t string) bool {
	switch t {
	case "event", "recipe": // Added "recipe"
		return true
	default:
		return false
	}
}

/* =========================
   CREATE
========================= */

func CreateFAQ(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		if !isValidEntityType(entityType) {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid entity type")
			return
		}

		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		content := strings.TrimSpace(body.Content)
		if content == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "FAQ cannot be empty")
			return
		}

		faq := FAQ{
			FAQID:      utils.GenerateRandomString(18),
			EntityType: entityType,
			EntityID:   entityID,
			Content:    content,
			CreatedBy:  utils.GetUserIDFromRequest(r),
			Likes:      0,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		if err := insertFAQ(ctx, app.DB, faq); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB insert failed")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.FAQCreatedEvent, mqevent.FAQCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, faq)
	}
}

/* =========================
   UPDATE
========================= */

func UpdateFAQ(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		faqID := utils.GetParam(r, "faqid")
		if faqID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		content := strings.TrimSpace(body.Content)
		if content == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "FAQ cannot be empty")
			return
		}

		/* Fetch + ownership check */
		var existing FAQ
		err := findFAQByID(ctx, app.DB, faqID, &existing)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				utils.RespondWithError(w, http.StatusNotFound, "FAQ not found")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "DB error")
			return
		}

		if existing.CreatedBy != utils.GetUserIDFromRequest(r) {
			utils.RespondWithError(w, http.StatusForbidden, "Forbidden")
			return
		}

		update := bson.M{"$set": bson.M{
			"content":    content,
			"updated_at": time.Now(),
		}}

		if _, err := updateFAQContent(ctx, app.DB, faqID, update); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB update failed")
			return
		}

		/* Return updated document */
		err = findFAQByID(ctx, app.DB, faqID, &existing)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Fetch failed")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.FAQUpdatedEvent, mqevent.FAQUpdatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, existing)
	}
}

/* =========================
   DELETE
========================= */

func DeleteFAQ(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		faqID := utils.GetParam(r, "faqid")
		if faqID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		count, err := deleteFAQ(ctx, app.DB, faqID, utils.GetUserIDFromRequest(r))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Delete failed")
			return
		}
		if count == 0 {
			utils.RespondWithError(w, http.StatusForbidden, "FAQ not found or forbidden")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
