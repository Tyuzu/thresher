package feed

import (
	"context"
	"encoding/json"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"strconv"
	"time"

	"naevis/infra/db"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// GetPost returns a single post enriched with like count
func GetPost(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		id := ps.ByName("postid")
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		post, err := FindFeedPost(ctx, app, id)
		if err != nil {
			http.Error(w, "Post not found", http.StatusNotFound)
			return
		}

		redisKey := "like:count:post:" + id
		var likeCount int64
		if data, err := app.Cache.Get(ctx, redisKey); err == nil && data != nil {
			likeCount, _ = strconv.ParseInt(string(data), 10, 64)
		} else {
			likeCount, _ = CountPostLikes(ctx, app, id)
			_ = app.Cache.Set(ctx, redisKey, []byte(strconv.FormatInt(likeCount, 10)), 10*time.Minute)
		}

		post.Likes = likeCount
		_ = UpdateFeedPostLikeCount(ctx, app, id, likeCount)

		if err := json.NewEncoder(w).Encode(post); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to encode post data")
		}
	}
}

// GetPosts returns a list of posts with usernames populated from Cache
func GetPosts(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		opts := db.FindManyOptions{
			Limit: 100,
			Sort:  bson.D{{Key: "timestamp", Value: -1}},
			Skip:  0,
		}
		posts, err := FindFeedPosts(ctx, app, opts)
		if err != nil {
			http.Error(w, "Failed to fetch posts", http.StatusInternalServerError)
			return
		}

		if len(posts) == 0 {
			posts = []models.FeedPost{}
		}

		userIDs := make([]string, 0, len(posts))
		seen := map[string]struct{}{}
		for _, p := range posts {
			if p.UserID == "" {
				continue
			}
			if _, ok := seen[p.UserID]; !ok {
				seen[p.UserID] = struct{}{}
				userIDs = append(userIDs, p.UserID)
			}
		}

		usernameMap := GetCachedUsernames(ctx, app, userIDs)

		for i := range posts {
			if uname, ok := usernameMap[posts[i].UserID]; ok && uname != "" {
				posts[i].Username = uname
			} else if posts[i].Username == "" {
				posts[i].Username = "unknown"
			}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"data": posts,
		})
	}
}
