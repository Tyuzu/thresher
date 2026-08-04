package domain

import (
	"context"

	db "naevis/infra/db"
	"naevis/models"
)

// FeedRepository defines persistence operations needed by feed usecases.
type FeedRepository interface {
	FindFeedPost(ctx context.Context, postID string) (models.FeedPost, error)
	FindFeedPosts(ctx context.Context, opts db.FindManyOptions) ([]models.FeedPost, error)

	GetPostLikeCount(ctx context.Context, postID string) (int64, error)
	UpdateFeedPostLikeCount(ctx context.Context, postID string, likeCount int64) error
	GetCachedUsernames(ctx context.Context, userIDs []string) (map[string]string, error)

	InsertFeedPost(ctx context.Context, post models.FeedPost) error
	FindAndUpdateFeedPost(ctx context.Context, filter any, update any, result any) error

	AggregateLikeCounts(ctx context.Context, postIDs []string) (map[string]int64, error)
	AggregateCommentCounts(ctx context.Context, postIDs []string) (map[string]int64, error)
	FindLikedPostIDsByUser(ctx context.Context, userID string, postIDs []string) (map[string]bool, error)
}
