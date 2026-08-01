package fanmade

import (
	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/userdata"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"
)

// DeleteMedia deletes a single media item if the requesting user is the creator
func DeleteMedia(app *infra.Deps) http.HandlerFunc {
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

		// Fetch the media using Database interface
		media, err := getFanMediaByID(ctx, app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		if media.CreatorID != requestingUserID {
			http.Error(w, "Not authorized to delete this media", http.StatusForbidden)
			return
		}

		// Delete media using Database interface
		if _, err := deleteFanMediaByID(ctx, app, mediaID); err != nil {
			http.Error(w, "Failed to delete media", http.StatusInternalServerError)
			return
		}

		userdata.DelUserData("media", mediaID, requestingUserID, app)

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.FanMediaRemovedEvent, mqevent.FanMediaRemovedPayload{}); err != nil {
			log.Printf("failed to publish fan media removed event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Media deleted successfully",
		})
	}
}
