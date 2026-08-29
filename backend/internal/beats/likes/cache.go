package likes

import (
	"context"
	"strconv"
	"time"

	"scav/infra"
)

const likeCacheTTL = 30 * time.Second

func redisLikeKey(entityType, entityID string) string {
	return "like:count:" + entityType + ":" + entityID
}

func HowManyLikes(entityType, entityID string) string {
	return redisLikeKey(entityType, entityID)
}

func getCachedLikeCount(
	ctx context.Context,
	app *infra.Deps,
	entityType string,
	entityID string,
) (int64, bool) {
	key := redisLikeKey(entityType, entityID)

	data, err := app.Cache.Get(ctx, key)
	if err != nil || len(data) == 0 {
		return 0, false
	}

	count, err := strconv.ParseInt(string(data), 10, 64)
	if err != nil || count < 0 {
		return 0, false
	}

	return count, true
}

func setCachedLikeCount(
	ctx context.Context,
	app *infra.Deps,
	entityType string,
	entityID string,
	count int64,
) {
	if count < 0 {
		count = 0
	}

	key := redisLikeKey(entityType, entityID)

	_ = app.Cache.Set(
		ctx,
		key,
		[]byte(strconv.FormatInt(count, 10)),
		likeCacheTTL,
	)
}

func invalidateLikeCount(
	ctx context.Context,
	app *infra.Deps,
	entityType string,
	entityID string,
) {
	key := redisLikeKey(entityType, entityID)

	_ = app.Cache.Del(ctx, key)
}
