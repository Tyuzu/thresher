package home

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/infra/db"
)

func fetchHomeCardsFromDB(ctx context.Context, app *infra.Deps, category string, skip, limit int) ([]HomeCard, error) {
	collection, projector := categoryProjection(category)
	if collection == "" || projector == nil {
		return []HomeCard{}, nil
	}

	opts := db.FindManyOptions{
		Skip:  skip,
		Limit: limit,
		Sort:  bson.D{{Key: "createdAt", Value: -1}},
	}

	var docs []bson.M
	if err := app.DB.FindManyWithOptions(ctx, collection, bson.M{}, opts, &docs); err != nil {
		return nil, err
	}

	cards := make([]HomeCard, 0, len(docs))
	for _, doc := range docs {
		cards = append(cards, projector(doc))
	}

	return cards, nil
}
