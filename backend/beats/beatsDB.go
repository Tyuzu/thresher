package beats

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
	"naevis/infra"
	"naevis/models"
	log "naevis/utils/logger"
)

const likesCollection = "likes"

var subscribersCollection = config.Collections.SubscribersCollection
var usersCollection = config.Collections.UserCollection
var followingsCollection = config.Collections.FollowingsCollection

func UpdateFollowRelationship(
	ctx context.Context,
	currentUserID,
	targetUserID,
	action string,
	app *infra.Deps,
) error {
	if action != "follow" && action != "unfollow" {
		return fmt.Errorf("invalid action: %s", action)
	}

	var currentUserUpdate any
	var targetUserUpdate any

	if action == "follow" {
		currentUserUpdate = bson.M{
			"$addToSet": bson.M{"follows": targetUserID},
		}
		targetUserUpdate = bson.M{
			"$addToSet": bson.M{"followers": currentUserID},
		}
	} else {
		currentUserUpdate = bson.M{
			"$pull": bson.M{"follows": targetUserID},
		}
		targetUserUpdate = bson.M{
			"$pull": bson.M{"followers": currentUserID},
		}
	}

	if err := app.DB.Upsert(
		ctx,
		followingsCollection,
		bson.M{"userid": currentUserID},
		currentUserUpdate,
	); err != nil {
		return fmt.Errorf("failed to update current user's follows: %w", err)
	}

	if err := app.DB.Upsert(
		ctx,
		followingsCollection,
		bson.M{"userid": targetUserID},
		targetUserUpdate,
	); err != nil {
		return fmt.Errorf("failed to update target user's followers: %w", err)
	}

	return nil
}

func CreateFollowEntry(userid string, app *infra.Deps) {
	follow := models.UserFollow{
		UserID:    userid,
		Follows:   []string{},
		Followers: []string{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := app.DB.Insert(
		ctx,
		followingsCollection,
		follow,
	)
	if err != nil {
		log.Printf("Error inserting follow entry for %s: %v", userid, err)
	}
}

func UpdateEntitySubscription(
	ctx context.Context,
	userID,
	entityType,
	entityID,
	action string,
	app *infra.Deps,
) error {
	if action != "subscribe" && action != "unsubscribe" {
		return fmt.Errorf("invalid action: %s", action)
	}

	EnsureSubscriptionEntry(ctx, userID, app)
	EnsureSubscriptionEntry(ctx, entityID, app)

	var userUpdate any
	var entityUpdate any

	if action == "subscribe" {
		userUpdate = bson.M{
			"$addToSet": bson.M{"subscribed": entityID},
		}
		entityUpdate = bson.M{
			"$addToSet": bson.M{"subscribers": userID},
		}
	} else {
		userUpdate = bson.M{
			"$pull": bson.M{"subscribed": entityID},
		}
		entityUpdate = bson.M{
			"$pull": bson.M{"subscribers": userID},
		}
	}

	if err := app.DB.UpdateOne(
		ctx,
		subscribersCollection,
		bson.M{"userid": userID},
		userUpdate,
	); err != nil {
		return fmt.Errorf("failed to update user subscriptions: %w", err)
	}

	if err := app.DB.UpdateOne(
		ctx,
		subscribersCollection,
		bson.M{"userid": entityID},
		entityUpdate,
	); err != nil {
		return fmt.Errorf("failed to update entity subscribers: %w", err)
	}

	return nil
}

func EnsureSubscriptionEntry(ctx context.Context, userID string, app *infra.Deps) {
	doc := bson.M{
		"userid":      userID,
		"subscribed":  []string{},
		"subscribers": []string{},
	}

	err := app.DB.Upsert(
		ctx,
		subscribersCollection,
		bson.M{"userid": userID},
		bson.M{"$setOnInsert": doc},
	)

	if err != nil {
		log.Printf("Failed to ensure subscription entry for %s: %v", userID, err)
	}
}

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
