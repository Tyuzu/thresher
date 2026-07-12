package feed

import (
	"encoding/json"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// POST /api/v1/feed/post
func CreateFeedPost(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		token := r.Header.Get("Authorization")
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload PostPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		post, err := CreateOrEditPost(ctx, claims, payload, ActionCreate, app)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.FeedPostCreatedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.FeedPostCreatedEvent, mqpayload); err != nil {
			log.Printf("Failed to publish FeedPostCreatedEvent: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"data": post,
		})
	}
}

// PATCH /api/v1/feed/post/:postid
func EditPost(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		token := r.Header.Get("Authorization")
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload PostPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		payload.PostID = ps.ByName("postid")

		post, err := CreateOrEditPost(ctx, claims, payload, ActionEdit, app)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.FeedPostUpdatedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.FeedPostUpdatedEvent, mqpayload); err != nil {
			log.Printf("Failed to publish FeedPostUpdatedEvent: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"data": post,
		})
	}
}
