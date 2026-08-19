package likes

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func EnsureIndexes(
	ctx context.Context,
	collection *mongo.Collection,
) error {

	_, err := collection.Indexes().CreateMany(
		ctx,
		[]mongo.IndexModel{
			{
				Keys: bson.D{
					{Key: "user_id", Value: 1},
					{Key: "entity_type", Value: 1},
					{Key: "entity_id", Value: 1},
				},
				Options: options.Index().
					SetUnique(true).
					SetName("unique_user_entity_like"),
			},
			{
				Keys: bson.D{
					{Key: "entity_type", Value: 1},
					{Key: "entity_id", Value: 1},
					{Key: "created_at", Value: -1},
				},
				Options: options.Index().
					SetName("entity_likes_created_at"),
			},
		},
	)

	return err
}
