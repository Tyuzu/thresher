package farms

import (
	"context"

	"scav/infra/db"

	"go.mongodb.org/mongo-driver/bson"

	"scav/config"
)

var (
	cropsCollection      = config.Collections.CropsCollection
	farmsCollection      = config.Collections.FarmsCollection
	usersCollection      = config.Collections.UserCollection
	farmOrdersCollection = config.Collections.FarmOrdersCollection
	productsCollection   = config.Collections.ProductCollection
)

func insertFarm(ctx context.Context, database db.Database, farm Farm) error {
	return database.InsertOne(ctx, farmsCollection, farm)
}

func getFarmByID(ctx context.Context, database db.Database, farmID string) (Farm, error) {
	var farm Farm
	err := database.FindOne(ctx, farmsCollection, bson.M{"farmid": farmID}, &farm)
	return farm, err
}

func updateOwnedFarm(ctx context.Context, database db.Database, farmID, userID string, update any) (any, error) {
	return database.UpdateOne(ctx, farmsCollection, bson.M{"farmid": farmID, "userid": userID}, update)
}

func deleteFarmByID(ctx context.Context, database db.Database, farmID string) (int64, error) {
	return database.DeleteOne(ctx, farmsCollection, bson.M{"farmid": farmID})
}
