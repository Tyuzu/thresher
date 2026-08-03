package usecase

import (
	"context"

	"naevis/models"
	"naevis/places/domain"
)

type PlacesUsecase struct {
	repo domain.PlacesRepository
}

func NewPlacesUsecase(r domain.PlacesRepository) *PlacesUsecase {
	return &PlacesUsecase{repo: r}
}

func (u *PlacesUsecase) CreatePlace(ctx context.Context, p models.Place) error {
	return u.repo.InsertPlace(ctx, p)
}

func (u *PlacesUsecase) GetPlace(ctx context.Context, placeID string) (models.Place, error) {
	return u.repo.FindPlaceByID(ctx, placeID)
}

func (u *PlacesUsecase) ListPlaces(ctx context.Context, filter map[string]any) ([]models.Place, error) {
	return u.repo.FindPlaces(ctx, filter)
}

func (u *PlacesUsecase) EditPlace(ctx context.Context, placeID string, updates map[string]any) error {
	return u.repo.UpdatePlace(ctx, placeID, updates)
}

func (u *PlacesUsecase) DeletePlace(ctx context.Context, placeID string) (int64, error) {
	return u.repo.DeletePlace(ctx, placeID)
}
