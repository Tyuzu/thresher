package media

import (
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

func EditMedia(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")
		mediaID := utils.GetParam(r, "id")

		requestingUserID, ok := ctx.Value(config.UserIDKey).(string)
		if !ok || requestingUserID == "" {
			http.Error(w, "Invalid user", http.StatusUnauthorized)
			return
		}

		var payload struct {
			Caption     *string  `json:"caption,omitempty"`
			Description *string  `json:"description,omitempty"`
			Visibility  *string  `json:"visibility,omitempty"`
			Tags        []string `json:"tags,omitempty"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON payload: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Fetch media to verify existence and ownership
		media, err := getMediaByID(ctx, app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		// Authorization check
		if media.CreatorID != requestingUserID {
			http.Error(w, "Not authorized to edit this media", http.StatusForbidden)
			return
		}

		// Build update document
		updateFields := bson.M{
			"updatedAt": time.Now(),
		}

		if payload.Caption != nil {
			updateFields["caption"] = *payload.Caption
		}
		if payload.Description != nil {
			updateFields["description"] = *payload.Description
		}
		if payload.Visibility != nil {
			updateFields["visibility"] = *payload.Visibility
		}
		if payload.Tags != nil {
			updateFields["tags"] = payload.Tags
		}

		// Update all media in the same group
		updatedMedias, err := updateMediaGroup(ctx, app, media.MediaGroupID, updateFields)
		if err != nil {
			http.Error(w, "Failed to load updated media", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.MediaUpdatedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.MediaUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, updatedMedias)
	}
}
