package feed

import (
	"context"
	"naevis/feed/repo"
	"naevis/feed/usecase"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	db "naevis/infra/db"

	"go.mongodb.org/mongo-driver/bson"
)

// GetPost returns a single post enriched with like count
func GetPost(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := utils.GetParam(r, "postid")
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
		uc := usecase.NewFeedUsecase(repoImpl)

		post, err := uc.GetPost(ctx, id)
		if err != nil {
			http.Error(w, "Post not found", http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, post)
	}
}

// GetPosts returns a list of posts with usernames populated from Cache
func GetPosts(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
		uc := usecase.NewFeedUsecase(repoImpl)

		opts := db.FindManyOptions{
			Limit: 100,
			Sort:  bson.D{{Key: "timestamp", Value: -1}},
			Skip:  0,
		}
		posts, err := uc.GetPosts(ctx, opts)
		if err != nil {
			http.Error(w, "Failed to fetch posts", http.StatusInternalServerError)
			return
		}

		if len(posts) == 0 {
			posts = []models.FeedPost{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"data": posts,
		})
	}
}
