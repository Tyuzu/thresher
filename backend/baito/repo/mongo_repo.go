package repo

import (
	"context"

	"naevis/baito/domain"
	"naevis/config"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoBaitoRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.BaitoRepository {
	return &MongoBaitoRepo{db: d}
}

func (m *MongoBaitoRepo) CreateBaito(ctx context.Context, b models.Baito) error {
	return m.db.Insert(ctx, config.Collections.BaitoCollection, b)
}

func (m *MongoBaitoRepo) UpdateBaito(ctx context.Context, baitoID, userID string, update map[string]any) error {
	return m.db.UpdateOne(ctx, config.Collections.BaitoCollection, bson.M{"baitoid": baitoID, "ownerid": userID}, update)
}

func (m *MongoBaitoRepo) DeleteBaito(ctx context.Context, baitoID, userID string) error {
	_, err := m.db.DeleteOne(ctx, config.Collections.BaitoCollection, bson.M{"baitoid": baitoID, "ownerid": userID})
	return err
}

func (m *MongoBaitoRepo) FindBaitoByID(ctx context.Context, baitoID string) (models.Baito, error) {
	var baito models.Baito
	if err := m.db.FindOne(ctx, config.Collections.BaitoCollection, bson.M{"baitoid": baitoID}, &baito); err != nil {
		return models.Baito{}, err
	}
	return baito, nil
}

func (m *MongoBaitoRepo) ListLatestBaitos(ctx context.Context, filter any, limit int) ([]models.BaitosResponse, error) {
	var baitos []models.BaitosResponse
	err := m.db.FindManyWithOptions(ctx, config.Collections.BaitoCollection, filter, db.FindManyOptions{Limit: limit}, &baitos)
	return baitos, err
}

func (m *MongoBaitoRepo) ListRelatedBaitos(ctx context.Context, filter any, limit int) ([]models.BaitosResponse, error) {
	var baitos []models.BaitosResponse
	err := m.db.FindManyWithOptions(ctx, config.Collections.BaitoCollection, filter, db.FindManyOptions{Limit: limit}, &baitos)
	return baitos, err
}

func (m *MongoBaitoRepo) FindMyBaitos(ctx context.Context, userID string) ([]models.BaitosResponse, error) {
	var baitos []models.BaitosResponse
	err := m.db.FindManyWithOptions(ctx, config.Collections.BaitoCollection, bson.M{"ownerId": userID}, db.FindManyOptions{Sort: bson.D{{Key: "createdat", Value: -1}}}, &baitos)
	return baitos, err
}

func (m *MongoBaitoRepo) SaveApplication(ctx context.Context, appx models.BaitoApplication) error {
	return m.db.Insert(ctx, config.Collections.BaitoApplicationsCollection, appx)
}

func (m *MongoBaitoRepo) ListApplications(ctx context.Context, baitoID string) ([]map[string]any, error) {
	var results []map[string]any
	err := m.db.FindMany(ctx, config.Collections.BaitoApplicationsCollection, bson.M{"baitoid": baitoID}, &results)
	return results, err
}

func (m *MongoBaitoRepo) ListMyApplications(ctx context.Context, userID string) ([]map[string]any, error) {
	var results []map[string]any
	// Placeholder: use legacy aggregate in DB helper if needed
	return results, nil
}

// worker profiles
func (m *MongoBaitoRepo) CreateWorker(ctx context.Context, w models.BaitoWorker) error {
	return m.db.Insert(ctx, config.Collections.BaitoWorkerCollection, w)
}

func (m *MongoBaitoRepo) UpdateWorker(ctx context.Context, workerID, userID string, update map[string]any) error {
	return m.db.UpdateOne(ctx, config.Collections.BaitoWorkerCollection, bson.M{"baitoworkerid": workerID, "userid": userID}, update)
}

func (m *MongoBaitoRepo) FindWorkerByUser(ctx context.Context, userID string) (models.BaitoWorker, error) {
	var w models.BaitoWorker
	if err := m.db.FindOne(ctx, config.Collections.BaitoWorkerCollection, bson.M{"userid": userID}, &w); err != nil {
		return models.BaitoWorker{}, err
	}
	return w, nil
}
