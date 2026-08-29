package likes

import (
	"context"
	"errors"
	"scav/config"
	"scav/infra"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var usersCollection = config.Collections.UserCollection
var likesCollection = config.Collections.LikesCollection

type Repository interface {
	Insert(ctx context.Context, like Like) error
	Delete(ctx context.Context, userID, entityType, entityID string) (int64, error)
	FindOne(ctx context.Context, userID, entityType, entityID string) (bool, error)
	Count(ctx context.Context, entityType, entityID string) (int64, error)
}

type mongoRepository struct {
	app *infra.Deps
}

func NewMongoRepository(app *infra.Deps) Repository {
	return &mongoRepository{app: app}
}

func (r *mongoRepository) Insert(ctx context.Context, like Like) error {
	return r.app.DB.Insert(ctx, likesCollection, like)
}

func (r *mongoRepository) Delete(ctx context.Context, userID, entityType, entityID string) (int64, error) {
	filter := bson.M{
		"user_id":     userID,
		"entity_type": entityType,
		"entity_id":   entityID,
	}
	return r.app.DB.DeleteOne(ctx, likesCollection, filter)
}

func (r *mongoRepository) FindOne(ctx context.Context, userID, entityType, entityID string) (bool, error) {
	filter := bson.M{
		"user_id":     userID,
		"entity_type": entityType,
		"entity_id":   entityID,
	}

	var like Like
	err := r.app.DB.FindOne(ctx, likesCollection, filter, &like)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, mongo.ErrNoDocuments) {
		return false, nil
	}

	return false, err
}

func (r *mongoRepository) Count(ctx context.Context, entityType, entityID string) (int64, error) {
	return r.app.DB.CountDocuments(
		ctx,
		likesCollection,
		bson.M{
			"entity_type": entityType,
			"entity_id":   entityID,
		},
	)
}
