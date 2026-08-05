package autocomplete

import (
	"context"

	"naevis/config"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var (
	AutocompleteCollection = config.Collections.AutocompleteCollection
)

func findPlacesByQuery(ctx context.Context, database db.Database, query string, places *[]models.Place) error {
	filter := bson.M{
		"name": bson.M{
			"$regex":   "^" + query,
			"$options": "i",
		},
	}
	return database.FindMany(ctx, AutocompleteCollection, filter, places)
}

func findUsersByQuery(ctx context.Context, database db.Database, query string, users *[]models.User) error {
	filter := bson.M{
		"username": bson.M{
			"$regex":   "^" + query,
			"$options": "i",
		},
	}
	return database.FindMany(ctx, AutocompleteCollection, filter, users)
}
