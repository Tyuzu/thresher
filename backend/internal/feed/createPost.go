package feed

import (
	"encoding/json"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/middleware"
	"naevis/utils"
	"net/http"
)

// POST /api/v1/feed/post
func CreateFeedPost(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		token := r.Header.Get("Authorization")
		claims, err := middleware.ValidateJWT(token)
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

		mq.PublishWithMeta(ctx, app.MQ, mqevent.FeedPostCreatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"data": post,
		})
	}
}

// PATCH /api/v1/feed/post/:postid
func EditPost(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		token := r.Header.Get("Authorization")
		claims, err := middleware.ValidateJWT(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload PostPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		payload.PostID = utils.GetParam(r, "postid")

		post, err := CreateOrEditPost(ctx, claims, payload, ActionEdit, app)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.FeedPostUpdatedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.FeedPostUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"data": post,
		})
	}
}
