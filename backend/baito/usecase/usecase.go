package usecase

import (
	"context"

	"naevis/baito/domain"
	"naevis/models"
)

type BaitoUsecase struct {
	repo domain.BaitoRepository
}

func NewBaitoUsecase(r domain.BaitoRepository) *BaitoUsecase {
	return &BaitoUsecase{repo: r}
}

func (u *BaitoUsecase) CreateBaito(ctx context.Context, b models.Baito) error {
	return u.repo.CreateBaito(ctx, b)
}

func (u *BaitoUsecase) UpdateBaito(ctx context.Context, baitoID, userID string, update map[string]any) error {
	return u.repo.UpdateBaito(ctx, baitoID, userID, update)
}

func (u *BaitoUsecase) DeleteBaito(ctx context.Context, baitoID, userID string) error {
	return u.repo.DeleteBaito(ctx, baitoID, userID)
}

func (u *BaitoUsecase) GetBaito(ctx context.Context, baitoID string) (models.Baito, error) {
	return u.repo.FindBaitoByID(ctx, baitoID)
}

func (u *BaitoUsecase) ListLatest(ctx context.Context, filter any, limit int) ([]models.BaitosResponse, error) {
	return u.repo.ListLatestBaitos(ctx, filter, limit)
}

func (u *BaitoUsecase) ListRelated(ctx context.Context, filter any, limit int) ([]models.BaitosResponse, error) {
	return u.repo.ListRelatedBaitos(ctx, filter, limit)
}

func (u *BaitoUsecase) ListMyBaitos(ctx context.Context, userID string) ([]models.BaitosResponse, error) {
	return u.repo.FindMyBaitos(ctx, userID)
}

func (u *BaitoUsecase) SaveApplication(ctx context.Context, appx models.BaitoApplication) error {
	return u.repo.SaveApplication(ctx, appx)
}

func (u *BaitoUsecase) ListApplications(ctx context.Context, baitoID string) ([]map[string]any, error) {
	return u.repo.ListApplications(ctx, baitoID)
}

func (u *BaitoUsecase) ListMyApplications(ctx context.Context, userID string) ([]map[string]any, error) {
	return u.repo.ListMyApplications(ctx, userID)
}

// worker profile usecases
func (u *BaitoUsecase) CreateWorker(ctx context.Context, w models.BaitoWorker) error {
	return u.repo.CreateWorker(ctx, w)
}

func (u *BaitoUsecase) UpdateWorker(ctx context.Context, workerID, userID string, update map[string]any) error {
	return u.repo.UpdateWorker(ctx, workerID, userID, update)
}

func (u *BaitoUsecase) FindWorkerByUser(ctx context.Context, userID string) (models.BaitoWorker, error) {
	return u.repo.FindWorkerByUser(ctx, userID)
}
