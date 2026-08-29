package notices

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// --- helper: make summary ---
func makeSummary(content string) string {
	trimmed := strings.TrimSpace(content)
	if len(trimmed) == 0 {
		return ""
	}
	lines := strings.SplitN(trimmed, "\n", 3)
	if len(lines) > 2 {
		return strings.Join(lines[:2], "\n")
	}
	if len(trimmed) > 200 {
		return trimmed[:200]
	}
	return trimmed
}

// --- helper: parse request ---
func parseNoticeRequest(r *http.Request) (title, content, summary string, errMsg string, ok bool) {
	var body struct {
		Content string `json:"content"`
		Title   string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return "", "", "", "Invalid JSON", false
	}

	content = strings.TrimSpace(body.Content)
	title = strings.TrimSpace(body.Title)
	if content == "" {
		return "", "", "", "Notice cannot be empty", false
	}
	return title, content, makeSummary(content), "", true
}

// --- Create Notice ---
func CreateNotice(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		title, content, summary, errMsg, ok := parseNoticeRequest(r)
		if !ok {
			utils.RespondWithError(w, http.StatusBadRequest, errMsg)
			return
		}

		userID := utils.GetUserIDFromRequest(r)

		notice := Notice{
			NoticeID:   utils.GenerateRandomDigitString(13), // use your string ID generator
			EntityType: entityType,
			EntityId:   entityID,
			CreatedBy:  userID,
			Title:      title,
			Content:    content,
			Summary:    summary,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		if err := app.DB.Insert(ctx, noticesCollection, notice); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB insert failed")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.NoticeCreatedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.NoticeCreatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, notice)
	}
}

// --- Update Notice ---
func UpdateNotice(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		noticeID := strings.TrimSpace(utils.GetParam(r, "noticeid"))
		if noticeID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		title, content, summary, errMsg, ok := parseNoticeRequest(r)
		if !ok {
			utils.RespondWithError(w, http.StatusBadRequest, errMsg)
			return
		}

		userID := utils.GetUserIDFromRequest(r)

		var existing Notice
		if err := app.DB.FindOne(
			ctx,
			noticesCollection,
			bson.M{"noticeid": noticeID},
			&existing,
		); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Notice not found")
			return
		}

		if existing.CreatedBy != userID {
			utils.RespondWithError(w, http.StatusForbidden, "Forbidden")
			return
		}

		update := bson.M{
			"title":      title,
			"content":    content,
			"summary":    summary,
			"updated_at": time.Now(),
		}

		// ✅ pass plain fields
		if _, err := app.DB.Update(
			ctx,
			noticesCollection,
			bson.M{"noticeid": noticeID},
			update,
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB update failed")
			return
		}

		// Fetch updated notice
		if err := app.DB.FindOne(
			ctx,
			noticesCollection,
			bson.M{"noticeid": noticeID},
			&existing,
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Fetch failed")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.NoticeUpdatedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.NoticeUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, existing)
	}
}

// --- Delete Notice ---
func DeleteNotice(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		noticeID := strings.TrimSpace(utils.GetParam(r, "noticeid"))
		if noticeID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		userID := utils.GetUserIDFromRequest(r)

		var existing Notice
		if err := app.DB.FindOne(
			ctx,
			noticesCollection,
			bson.M{"noticeid": noticeID},
			&existing,
		); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Notice not found")
			return
		}

		if existing.CreatedBy != userID {
			utils.RespondWithError(w, http.StatusForbidden, "Forbidden")
			return
		}

		if _, err := app.DB.Delete(
			ctx,
			noticesCollection,
			bson.M{"noticeid": noticeID},
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Delete failed")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
