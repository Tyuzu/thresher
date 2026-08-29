package subscribe

import (
	"context"
	"fmt"
	"log"
	"scav/config"
	"scav/infra"

	"go.mongodb.org/mongo-driver/bson"
)

var subscribersCollection = config.Collections.SubscribersCollection
var usersCollection = config.Collections.UserCollection

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

	if _, err := app.DB.UpdateOne(
		ctx,
		subscribersCollection,
		bson.M{"userid": userID},
		userUpdate,
	); err != nil {
		return fmt.Errorf("failed to update user subscriptions: %w", err)
	}

	if _, err := app.DB.UpdateOne(
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
