package feed

import (
	"encoding/json"
	"naevis/config/mqevent"
	feedmodels "naevis/feed/models"
	"naevis/feed/repo"
	"naevis/feed/usecase"
	"naevis/infra"
	"naevis/userdata"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"
)

// POST /api/v1/feed/post
func CreateFeedPost(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		token := r.Header.Get("Authorization")
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload feedmodels.PostPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
		uc := usecase.NewFeedUsecase(repoImpl)

		post, err := uc.CreateOrEditPost(ctx, claims, payload, feedmodels.ActionCreate)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		userdata.SetUserData("feedpost", post.PostID, claims.UserID, "", "", app)

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
func EditPost(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		token := r.Header.Get("Authorization")
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload feedmodels.PostPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		payload.PostID = utils.GetParam(r, "postid")

		repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
		uc := usecase.NewFeedUsecase(repoImpl)

		post, err := uc.CreateOrEditPost(ctx, claims, payload, feedmodels.ActionEdit)
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
