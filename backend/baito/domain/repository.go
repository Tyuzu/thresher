package domain

import (
	"context"

	"naevis/models"
)

// BaitoRepository defines persistence operations required by baito usecases.
type BaitoRepository interface {
	CreateBaito(ctx context.Context, b models.Baito) error
	UpdateBaito(ctx context.Context, baitoID, userID string, update map[string]any) error
	DeleteBaito(ctx context.Context, baitoID, userID string) error
	FindBaitoByID(ctx context.Context, baitoID string) (models.Baito, error)
	ListLatestBaitos(ctx context.Context, filter any, limit int) ([]models.BaitosResponse, error)
	ListRelatedBaitos(ctx context.Context, filter any, limit int) ([]models.BaitosResponse, error)
	FindMyBaitos(ctx context.Context, userID string) ([]models.BaitosResponse, error)
	SaveApplication(ctx context.Context, app models.BaitoApplication) error
	ListApplications(ctx context.Context, baitoID string) ([]map[string]any, error)
	ListMyApplications(ctx context.Context, userID string) ([]map[string]any, error)

	// worker profiles
	CreateWorker(ctx context.Context, w models.BaitoWorker) error
	UpdateWorker(ctx context.Context, workerID, userID string, update map[string]any) error
	FindWorkerByUser(ctx context.Context, userID string) (models.BaitoWorker, error)
}
