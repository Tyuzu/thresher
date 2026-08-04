package feed

import (
	"context"
	"encoding/json"
	feedmodels "naevis/feed/models"
	"naevis/feed/repo"
	"naevis/feed/usecase"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"time"
)

func GetPostsMetadata(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
		defer cancel()

		var req feedmodels.BulkMetadataRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}

		userID, _ := r.Context().Value("userId").(string)
		postIDs := req.IDs

		repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
		uc := usecase.NewFeedUsecase(repoImpl)

		result, err := uc.GetPostsMetadata(ctx, userID, postIDs)
		if err != nil {
			http.Error(w, "Failed to fetch metadata", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, result)
	}
}
