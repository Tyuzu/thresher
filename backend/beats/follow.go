package beats

import (
	"net/http"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/userdata"
	"naevis/utils"
	log "naevis/utils/logger"
)

func HandleFollowAction(
	w http.ResponseWriter,
	r *http.Request,
	action string,
	app *infra.Deps,
) {
	ctx := r.Context()

	currentUserID, ok := r.Context().Value(config.UserIDKey).(string)
	if !ok || currentUserID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	targetUserID := utils.GetParam(r, "id")
	if targetUserID == "" {
		http.Error(w, "Target user ID required", http.StatusBadRequest)
		return
	}

	if err := UpdateFollowRelationship(ctx, currentUserID, targetUserID, action, app); err != nil {
		log.Printf("Error updating follow relationship: %v", err)
		http.Error(w, "Failed to update follow relationship", http.StatusInternalServerError)
		return
	}

	userdata.SetUserData(action, targetUserID, currentUserID, "profile", targetUserID, app)

	response := map[string]any{
		"isFollowing": action == "follow",
		"ok":          true,
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.UserFollowedEvent, mqevent.UserFollowedPayload{})

	utils.RespondWithJSON(w, http.StatusOK, response)
}

func ToggleFollow(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		HandleFollowAction(w, r, "follow", app)
	}
}

func ToggleUnFollow(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		HandleFollowAction(w, r, "unfollow", app)
	}
}
