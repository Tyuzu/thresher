package repo

import (
	"context"

	"naevis/config"
	"naevis/feed/domain"
	"naevis/infra/cache"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoFeedRepo struct {
	db    db.Database
	cache cache.Cache
}

func NewMongoRepo(d db.Database, c cache.Cache) domain.FeedRepository {
	return &MongoFeedRepo{db: d, cache: c}
}

func (m *MongoFeedRepo) FindFeedPost(ctx context.Context, postID string) (models.FeedPost, error) {
	var post models.FeedPost
	if err := m.db.FindOne(ctx, config.Collections.FeedPostsCollection, bson.M{"postid": postID}, &post); err != nil {
		return models.FeedPost{}, err
	}
	return post, nil
}

func (m *MongoFeedRepo) FindFeedPosts(ctx context.Context, opts db.FindManyOptions) ([]models.FeedPost, error) {
	var posts []models.FeedPost
	if err := m.db.FindManyWithOptions(ctx, config.Collections.FeedPostsCollection, bson.M{}, opts, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

func (m *MongoFeedRepo) GetPostLikeCount(ctx context.Context, postID string) (int64, error) {
	return m.db.CountDocuments(ctx, config.Collections.LikesCollection, bson.M{"entity_type": "post", "entity_id": postID})
}

func (m *MongoFeedRepo) UpdateFeedPostLikeCount(ctx context.Context, postID string, likeCount int64) error {
	return m.db.UpdateOne(ctx, config.Collections.FeedPostsCollection, bson.M{"postid": postID}, bson.M{"likes": likeCount})
}

func (m *MongoFeedRepo) GetCachedUsernames(ctx context.Context, userIDs []string) (map[string]string, error) {
	usernameMap := make(map[string]string, len(userIDs))
	for _, id := range userIDs {
		if id == "" {
			continue
		}
		if data, err := m.cache.HGet(ctx, "users", id); err == nil && data != nil {
			usernameMap[id] = string(data)
		} else {
			usernameMap[id] = "unknown"
		}
	}
	return usernameMap, nil
}

func (m *MongoFeedRepo) InsertFeedPost(ctx context.Context, post models.FeedPost) error {
	return m.db.InsertOne(ctx, config.Collections.FeedPostsCollection, post)
}

func (m *MongoFeedRepo) FindAndUpdateFeedPost(ctx context.Context, filter any, update any, result any) error {
	return m.db.FindOneAndUpdate(ctx, config.Collections.FeedPostsCollection, filter, update, result)
}

func (m *MongoFeedRepo) AggregateLikeCounts(ctx context.Context, postIDs []string) (map[string]int64, error) {
	pipeline := []any{
		bson.M{"$match": bson.M{"postid": bson.M{"$in": postIDs}}},
		bson.M{"$group": bson.M{"_id": "$postid", "count": bson.M{"$sum": 1}}},
	}

	var results []struct {
		ID    string `bson:"_id"`
		Count int64  `bson:"count"`
	}
	if err := m.db.Aggregate(ctx, config.Collections.LikesCollection, pipeline, &results); err != nil {
		return nil, err
	}

	counts := make(map[string]int64, len(results))
	for _, r := range results {
		counts[r.ID] = r.Count
	}
	return counts, nil
}

func (m *MongoFeedRepo) AggregateCommentCounts(ctx context.Context, postIDs []string) (map[string]int64, error) {
	pipeline := []any{
		bson.M{"$match": bson.M{"postid": bson.M{"$in": postIDs}}},
		bson.M{"$group": bson.M{"_id": "$postid", "count": bson.M{"$sum": 1}}},
	}

	var results []struct {
		ID    string `bson:"_id"`
		Count int64  `bson:"count"`
	}
	if err := m.db.Aggregate(ctx, config.Collections.CommentsCollection, pipeline, &results); err != nil {
		return nil, err
	}

	counts := make(map[string]int64, len(results))
	for _, r := range results {
		counts[r.ID] = r.Count
	}
	return counts, nil
}

func (m *MongoFeedRepo) FindLikedPostIDsByUser(ctx context.Context, userID string, postIDs []string) (map[string]bool, error) {
	likedByUser := make(map[string]bool)
	if userID == "" {
		return likedByUser, nil
	}

	filter := bson.M{"postid": bson.M{"$in": postIDs}, "userid": userID}

	var userLikes []struct {
		PostID string `bson:"postid"`
	}
	if err := m.db.FindMany(ctx, config.Collections.LikesCollection, filter, &userLikes); err != nil {
		return likedByUser, err
	}
	for _, l := range userLikes {
		likedByUser[l.PostID] = true
	}
	return likedByUser, nil
}
