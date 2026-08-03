package reports

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func ApplyModerator(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		var payload struct {
			UserID string `json:"userid"`
			Reason string `json:"reason"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, `{"error":"Invalid JSON payload"}`, http.StatusBadRequest)
			return
		}

		payload.UserID = strings.TrimSpace(payload.UserID)
		payload.Reason = strings.TrimSpace(payload.Reason)

		if payload.UserID == "" || payload.Reason == "" {
			http.Error(w, `{"error":"Missing required fields"}`, http.StatusBadRequest)
			return
		}

		// Prevent duplicate applications
		var existing ModeratorApplication
		err := app.DB.FindOne(
			ctx,
			moderatorAppsCollection,
			bson.M{"userid": payload.UserID},
			&existing,
		)
		if err == nil {
			http.Error(w, `{"error":"You have already applied to be a moderator"}`, http.StatusConflict)
			return
		}

		genID, _ := utils.GenerateRandomString(16)
		appx := ModeratorApplication{
			ID:        "mod_" + genID,
			UserID:    payload.UserID,
			Reason:    payload.Reason,
			Status:    "pending",
			CreatedAt: time.Now().UTC(),
		}

		if err := app.DB.Insert(ctx, moderatorAppsCollection, appx); err != nil {
			http.Error(w, `{"error":"Failed to save application"}`, http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.AppliedForModeratorRolePayload{})
		app.MQ.Publish(ctx, mqevent.AppliedForModeratorRoleEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Moderator application submitted",
			"id":      appx.ID,
		})
	}
}
