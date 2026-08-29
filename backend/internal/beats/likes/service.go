package likes

import (
	"context"
	"time"

	"scav/infra"
)

type Service struct {
	app  *infra.Deps
	repo Repository
}

func NewService(app *infra.Deps, repo Repository) *Service {
	return &Service{
		app:  app,
		repo: repo,
	}
}

func (s *Service) Like(
	ctx context.Context,
	userID string,
	entityType string,
	entityID string,
) (int64, error) {

	like := Like{
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		CreatedAt:  time.Now().UTC(),
	}

	if err := s.repo.Insert(ctx, like); err != nil {
		return 0, err
	}

	invalidateLikeCount(ctx, s.app, entityType, entityID)

	count, err := s.repo.Count(ctx, entityType, entityID)
	if err != nil {
		return 0, err
	}

	setCachedLikeCount(ctx, s.app, entityType, entityID, count)

	return count, nil
}

func (s *Service) Unlike(
	ctx context.Context,
	userID string,
	entityType string,
	entityID string,
) (int64, error) {

	deletedCount, err := s.repo.Delete(ctx, userID, entityType, entityID)
	if err != nil {
		return 0, err
	}

	if deletedCount == 0 {
		return 0, ErrNotLiked
	}

	invalidateLikeCount(ctx, s.app, entityType, entityID)

	count, err := s.repo.Count(ctx, entityType, entityID)
	if err != nil {
		return 0, err
	}

	setCachedLikeCount(ctx, s.app, entityType, entityID, count)

	return count, nil
}

func (s *Service) IsLiked(
	ctx context.Context,
	userID string,
	entityType string,
	entityID string,
) (bool, error) {
	return s.repo.FindOne(ctx, userID, entityType, entityID)
}

func (s *Service) Count(
	ctx context.Context,
	entityType string,
	entityID string,
) (int64, error) {

	if count, ok := getCachedLikeCount(ctx, s.app, entityType, entityID); ok {
		return count, nil
	}

	count, err := s.repo.Count(ctx, entityType, entityID)
	if err != nil {
		return 0, err
	}

	setCachedLikeCount(ctx, s.app, entityType, entityID, count)

	return count, nil
}
