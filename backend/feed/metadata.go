package feed

import (
	"context"
	"encoding/json"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"time"
)

func GetPostsMetadata(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
		defer cancel()

		var req BulkMetadataRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}

		userID, _ := r.Context().Value("userId").(string)
		postIDs := req.IDs

		likeCounts, err := AggregateLikeCounts(ctx, app, postIDs)
		if err != nil {
			http.Error(w, "Failed to aggregate likes", http.StatusInternalServerError)
			return
		}

		commentCounts, err := AggregateCommentCounts(ctx, app, postIDs)
		if err != nil {
			http.Error(w, "Failed to aggregate comments", http.StatusInternalServerError)
			return
		}

		likedByUser, err := FindLikedPostIDsByUser(ctx, app, userID, postIDs)
		if err != nil {
			likedByUser = map[string]bool{}
		}

		// --- Assemble final response ---
		result := make([]PostMetadata, 0, len(postIDs))
		for _, pid := range postIDs {
			result = append(result, PostMetadata{
				PostID:      pid,
				Likes:       likeCounts[pid],
				Comments:    commentCounts[pid],
				LikedByUser: likedByUser[pid],
			})
		}

		utils.RespondWithJSON(w, http.StatusOK, result)
	}
}
