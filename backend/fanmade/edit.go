package fanmade

import (
	"encoding/json"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// EditMedia updates media metadata for a media group
func EditMedia(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		entityType := ps.ByName("entitytype")
		entityID := ps.ByName("entityid")
		mediaID := ps.ByName("id")

		// requestingUserID, ok := ctx.Value(globals.UserIDKey).(string)
		// if !ok || requestingUserID == "" {
		// 	http.Error(w, "Invalid user", http.StatusUnauthorized)
		// 	return
		// }
		requestingUserID := utils.GetUserIDFromRequest(r)

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

		// Fetch the media to get MediaGroupID
		media, err := getFanMediaByID(ctx, app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		if media.CreatorID != requestingUserID {
			http.Error(w, "Not authorized to edit this media", http.StatusForbidden)
			return
		}

		// Build update document
		update := map[string]any{"updatedAt": time.Now().UTC()}
		if payload.Caption != nil {
			update["caption"] = *payload.Caption
		}
		if payload.Description != nil {
			update["description"] = *payload.Description
		}
		if payload.Visibility != nil {
			update["visibility"] = *payload.Visibility
		}
		if payload.Tags != nil {
			update["tags"] = payload.Tags
		}

		// Apply update to all media in the same group
		updatedMedias, err := updateFanMediaGroup(ctx, app, media.MediaGroupID, update)
		if err != nil {
			http.Error(w, "Failed to update media group", http.StatusInternalServerError)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.FanMediaUpdatedEvent, mqevent.FanMediaUpdatedPayload{}); err != nil {
			log.Printf("failed to publish fan media updated event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, updatedMedias)
	}
}
