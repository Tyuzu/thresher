package feed

import (
	"context"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
)

var feedpostsCollection = config.Collections.FeedPostsCollection
var likesCollection = config.Collections.LikesCollection
var commentsCollection = config.Collections.CommentsCollection

func FindFeedPost(ctx context.Context, app *infra.Deps, postID string) (models.FeedPost, error) {
	var post models.FeedPost
	err := app.DB.FindOne(ctx, feedpostsCollection, map[string]any{"postid": postID}, &post)
	return post, err
}

func FindFeedPosts(ctx context.Context, app *infra.Deps, opts db.FindManyOptions) ([]models.FeedPost, error) {
	var posts []models.FeedPost
	if err := app.DB.FindManyWithOptions(ctx, feedpostsCollection, map[string]any{}, opts, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

func CountPostLikes(ctx context.Context, app *infra.Deps, postID string) (int64, error) {
	return app.DB.CountDocuments(ctx, likesCollection, map[string]any{
		"entity_type": "post",
		"entity_id":   postID,
	})
}

func UpdateFeedPostLikeCount(ctx context.Context, app *infra.Deps, postID string, likeCount int64) error {
	return app.DB.UpdateOne(ctx, feedpostsCollection, map[string]any{"postid": postID}, map[string]any{"likes": likeCount})
}

func GetCachedUsernames(ctx context.Context, app *infra.Deps, userIDs []string) map[string]string {
	usernameMap := make(map[string]string, len(userIDs))
	for _, id := range userIDs {
		if id == "" {
			continue
		}
		if data, err := app.Cache.HGet(ctx, "users", id); err == nil && data != nil {
			usernameMap[id] = string(data)
		} else {
			usernameMap[id] = "unknown"
		}
	}
	return usernameMap
}

func InsertFeedPost(ctx context.Context, app *infra.Deps, post models.FeedPost) error {
	return app.DB.InsertOne(ctx, feedpostsCollection, post)
}

func FindAndUpdateFeedPost(ctx context.Context, app *infra.Deps, filter any, update any, result any) error {
	return app.DB.FindOneAndUpdate(ctx, feedpostsCollection, filter, update, result)
}

func AggregateLikeCounts(ctx context.Context, app *infra.Deps, postIDs []string) (map[string]int64, error) {
	pipeline := []any{
		map[string]any{"$match": map[string]any{"postid": map[string]any{"$in": postIDs}}},
		map[string]any{"$group": map[string]any{"_id": "$postid", "count": map[string]any{"$sum": 1}}},
	}

	var results []struct {
		ID    string `bson:"_id"`
		Count int64  `bson:"count"`
	}
	if err := app.DB.Aggregate(ctx, likesCollection, pipeline, &results); err != nil {
		return nil, err
	}

	counts := make(map[string]int64, len(results))
	for _, r := range results {
		counts[r.ID] = r.Count
	}
	return counts, nil
}

func AggregateCommentCounts(ctx context.Context, app *infra.Deps, postIDs []string) (map[string]int64, error) {
	pipeline := []any{
		map[string]any{"$match": map[string]any{"postid": map[string]any{"$in": postIDs}}},
		map[string]any{"$group": map[string]any{"_id": "$postid", "count": map[string]any{"$sum": 1}}},
	}

	var results []struct {
		ID    string `bson:"_id"`
		Count int64  `bson:"count"`
	}
	if err := app.DB.Aggregate(ctx, commentsCollection, pipeline, &results); err != nil {
		return nil, err
	}

	counts := make(map[string]int64, len(results))
	for _, r := range results {
		counts[r.ID] = r.Count
	}
	return counts, nil
}

func FindLikedPostIDsByUser(ctx context.Context, app *infra.Deps, userID string, postIDs []string) (map[string]bool, error) {
	likedByUser := make(map[string]bool)
	if userID == "" {
		return likedByUser, nil
	}

	filter := map[string]any{
		"postid": map[string]any{"$in": postIDs},
		"userid": userID,
	}

	var userLikes []struct {
		PostID string `bson:"postid"`
	}
	if err := app.DB.FindMany(ctx, likesCollection, filter, &userLikes); err != nil {
		return likedByUser, err
	}
	for _, l := range userLikes {
		likedByUser[l.PostID] = true
	}
	return likedByUser, nil
}
