package feed

import (
	"context"
	"encoding/json"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

type BulkMetadataRequest struct {
	IDs []string `json:"ids"`
}

type PostMetadata struct {
	PostID      string `json:"postId"`
	Likes       int64  `json:"likes"`
	Comments    int64  `json:"comments"`
	LikedByUser bool   `json:"likedByUser"`
}

func GetPostsMetadata(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
