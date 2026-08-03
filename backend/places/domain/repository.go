package domain

import (
	"context"

	"naevis/models"
)

// Places repository interface for usecases
type PlacesRepository interface {
	InsertPlace(ctx context.Context, p models.Place) error
	FindPlaceByID(ctx context.Context, placeID string) (models.Place, error)
	FindPlaces(ctx context.Context, filter map[string]any) ([]models.Place, error)
	UpdatePlace(ctx context.Context, placeID string, updates map[string]any) error
	DeletePlace(ctx context.Context, placeID string) (int64, error)
}
