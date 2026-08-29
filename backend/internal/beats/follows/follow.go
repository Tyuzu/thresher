package follows

import (
	"context"
	"net/http"

	"scav/config"
	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/db"
	"scav/infra/mq"
	"scav/internal/userdata"
	"scav/utils"
	log "scav/utils/logger"
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

/* -------------------------------------------------------
   Follow data + caching utilities
------------------------------------------------------- */

// GetUserFollowData returns followers and follows for a user
func GetUserFollowData(ctx context.Context, userID string, database db.Database) (UserFollow, error) {
	var uf UserFollow
	_ = database.FindOne(ctx, "followings", map[string]any{"userid": userID}, &uf)

	// return empty if not found
	if uf.UserID == "" {
		return UserFollow{
			Followers: []string{},
			Follows:   []string{},
		}, nil
	}

	return uf, nil
}
