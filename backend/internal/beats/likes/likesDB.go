package likes

import (
	"context"
	"naevis/config"
	"naevis/infra"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

var usersCollection = config.Collections.UserCollection
var likesCollection = config.Collections.LikesCollection

func decrementRedisOrMongo(
	ctx context.Context,
	cacheKey,
	entityType,
	entityID string,
	app *infra.Deps,
) int64 {
	val, err := app.Cache.Incr(ctx, cacheKey)
	if err == nil {
		val = val - 2

		if val < 0 {
			_ = app.Cache.Set(ctx, cacheKey, []byte("0"), 30*time.Second)
			return 0
		}

		_ = app.Cache.Set(ctx, cacheKey, []byte(strconv.FormatInt(val, 10)), 30*time.Second)
		return val
	}

	count, _ := app.DB.CountDocuments(
		ctx,
		likesCollection,
		bson.M{
			"entity_type": entityType,
			"entity_id":   entityID,
		},
	)
	return count
}

func incrementRedisOrMongo(
	ctx context.Context,
	cacheKey,
	entityType,
	entityID string,
	app *infra.Deps,
) int64 {
	val, err := app.Cache.Incr(ctx, cacheKey)
	if err == nil {
		_ = app.Cache.Set(ctx, cacheKey, []byte(strconv.FormatInt(val, 10)), 30*time.Second)
		return val
	}

	count, _ := app.DB.CountDocuments(
		ctx,
		likesCollection,
		bson.M{
			"entity_type": entityType,
			"entity_id":   entityID,
		},
	)
	return count
}
