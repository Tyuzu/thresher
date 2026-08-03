package repo

import (
	"context"

	"naevis/config"
	db "naevis/infra/db"
	"naevis/models"
	"naevis/places/domain"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoPlacesRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.PlacesRepository {
	return &MongoPlacesRepo{db: d}
}

func (m *MongoPlacesRepo) InsertPlace(ctx context.Context, p models.Place) error {
	return m.db.Insert(ctx, config.Collections.PlacesCollection, p)
}

func (m *MongoPlacesRepo) FindPlaceByID(ctx context.Context, placeID string) (models.Place, error) {
	var p models.Place
	if err := m.db.FindOne(ctx, config.Collections.PlacesCollection, bson.M{"placeid": placeID}, &p); err != nil {
		return models.Place{}, err
	}
	return p, nil
}

func (m *MongoPlacesRepo) FindPlaces(ctx context.Context, filter map[string]any) ([]models.Place, error) {
	var res []models.Place
	if err := m.db.FindMany(ctx, config.Collections.PlacesCollection, bson.M(filter), &res); err != nil {
		return nil, err
	}
	return res, nil
}

func (m *MongoPlacesRepo) UpdatePlace(ctx context.Context, placeID string, updates map[string]any) error {
	return m.db.Update(ctx, config.Collections.PlacesCollection, bson.M{"placeid": placeID}, updates)
}

func (m *MongoPlacesRepo) DeletePlace(ctx context.Context, placeID string) (int64, error) {
	return m.db.DeleteOne(ctx, config.Collections.PlacesCollection, bson.M{"placeid": placeID})
}
