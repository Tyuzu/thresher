package beats

import (
	"net/http"

	"github.com/julienschmidt/httprouter"

	"naevis/infra"
	"naevis/userdata"
	"naevis/utils"
	log "naevis/utils/logger"
)

// Generic subscribe/follow/unfollow handler
func HandleEntitySubscription(
	w http.ResponseWriter,
	r *http.Request,
	ps httprouter.Params,
	entityType,
	action string,
	app *infra.Deps,
) {
	ctx := r.Context()

	currentUserID := utils.GetUserIDFromRequest(r)
	if currentUserID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	entityID := ps.ByName("id")
	if entityID == "" {
		http.Error(w, "Entity ID required", http.StatusBadRequest)
		return
	}

	if err := UpdateEntitySubscription(ctx, currentUserID, entityType, entityID, action, app); err != nil {
		log.Printf("Failed to update %s subscription: %v", entityType, err)
		http.Error(w, "Failed to update subscription", http.StatusInternalServerError)
		return
	}

	// Optional UI/userdata hook
	userdata.SetUserData(action, entityID, currentUserID, entityType, entityID, app)

	resp := map[string]any{
		"hasSubscribed": action == "subscribe",
		"ok":            true,
	}

	utils.RespondWithJSON(w, http.StatusOK, resp)
}

// PUT /api/v1/subscribes/:id
func SubscribeEntity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		HandleEntitySubscription(w, r, ps, ps.ByName("type"), "subscribe", app)
	}
}

// DELETE /api/v1/subscribes/:id
func UnsubscribeEntity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		HandleEntitySubscription(w, r, ps, ps.ByName("type"), "unsubscribe", app)
	}
}
