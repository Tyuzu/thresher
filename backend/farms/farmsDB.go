package farms

import (
	"context"

	"naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
)

var (
	farmsCollection      = config.Collections.FarmsCollection
	cropsCollection      = config.Collections.CropsCollection
	cropsAboutCollection = config.Collections.CropsAboutCollection
	farmOrdersCollection = config.Collections.FarmOrdersCollection
	usersCollection      = config.Collections.UserCollection
	catalogueCollection  = config.Collections.CatalogueCollection
	productsCollection   = config.Collections.ProductCollection
)

func insertFarm(ctx context.Context, database db.Database, farm models.Farm) error {
	return database.InsertOne(ctx, farmsCollection, farm)
}

func getFarmByID(ctx context.Context, database db.Database, farmID string) (models.Farm, error) {
	var farm models.Farm
	err := database.FindOne(ctx, farmsCollection, bson.M{"farmid": farmID}, &farm)
	return farm, err
}

func updateOwnedFarm(ctx context.Context, database db.Database, farmID, userID string, update any) error {
	return database.UpdateOne(ctx, farmsCollection, bson.M{"farmid": farmID, "userid": userID}, update)
}

func deleteFarmByID(ctx context.Context, database db.Database, farmID string) (int64, error) {
	return database.DeleteOne(ctx, farmsCollection, bson.M{"farmid": farmID})
}
