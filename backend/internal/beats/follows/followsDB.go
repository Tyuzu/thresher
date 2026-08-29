package follows

import (
	"context"
	"fmt"
	"scav/config"
	"scav/infra"
	log "scav/utils/logger"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

var followingsCollection = config.Collections.FollowingsCollection
var usersCollection = config.Collections.UserCollection

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
	follow := UserFollow{
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
