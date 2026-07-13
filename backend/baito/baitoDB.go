package baito

import (
	"context"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var UsersCollection = config.Collections.UserCollection
var BaitoCollection = config.Collections.BaitoCollection
var BaitoAppCollection = config.Collections.BaitoApplicationsCollection
var BaitoWorkersCollection = config.Collections.BaitoWorkerCollection

func deleteBaitoRecord(ctx context.Context, app *infra.Deps, baitoID, userID string) error {
	_, err := app.DB.DeleteOne(ctx, BaitoCollection, bson.M{
		"baitoid": baitoID,
		"ownerid": userID,
	})
	return err
}

func saveBaitoApplication(ctx context.Context, app *infra.Deps, application models.BaitoApplication) error {
	return app.DB.Insert(ctx, BaitoAppCollection, application)
}

func incrementBaitoApplicationCount(ctx context.Context, app *infra.Deps, baitoID string) error {
	return app.DB.Inc(ctx, BaitoCollection, bson.M{"baitoid": baitoID}, "applicationcount", 1)
}

func createBaitoRecord(ctx context.Context, app *infra.Deps, baito models.Baito) error {
	return app.DB.Insert(ctx, BaitoCollection, baito)
}

func updateBaitoRecord(ctx context.Context, app *infra.Deps, baitoID, userID string, update bson.M) error {
	return app.DB.UpdateOne(ctx, BaitoCollection, bson.M{
		"baitoid": baitoID,
		"ownerid": userID,
	}, update)
}

func findExistingWorkerProfile(ctx context.Context, app *infra.Deps, userID string, result any) error {
	return app.DB.FindOne(ctx, BaitoWorkersCollection, bson.M{"userId": userID}, result)
}

func createWorkerProfileRecord(ctx context.Context, app *infra.Deps, worker models.BaitoWorker) error {
	return app.DB.Insert(ctx, BaitoWorkersCollection, worker)
}

func updateWorkerProfileRecord(ctx context.Context, app *infra.Deps, workerID, userID string, update bson.M) error {
	return app.DB.UpdateOne(ctx, BaitoWorkersCollection, bson.M{
		"baitoWorkerId": workerID,
		"userId":        userID,
	}, update)
}

func addWorkerRoleToUser(ctx context.Context, app *infra.Deps, userID string) error {
	return app.DB.AddToSet(ctx, UsersCollection, bson.M{"userid": userID}, "role", "worker")
}

func touchUserUpdatedAt(ctx context.Context, app *infra.Deps, userID string) error {
	return app.DB.UpdateOne(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{"updated_at": time.Now()})
}

func findLatestBaitosFromDB(ctx context.Context, app *infra.Deps, filter any, limit int) ([]models.BaitosResponse, error) {
	var baitos []models.BaitosResponse
	err := app.DB.FindManyWithOptions(ctx, BaitoCollection, filter, db.FindManyOptions{
		Limit: limit,
		Sort:  bson.D{{Key: "createdAt", Value: -1}},
	}, &baitos)
	return baitos, err
}

func findRelatedBaitosFromDB(ctx context.Context, app *infra.Deps, filter any, limit int) ([]models.BaitosResponse, error) {
	var baitos []models.BaitosResponse
	err := app.DB.FindManyWithOptions(ctx, BaitoCollection, filter, db.FindManyOptions{
		Limit: limit,
		Sort:  bson.D{{Key: "createdAt", Value: -1}},
	}, &baitos)
	return baitos, err
}

func findBaitoByIDFromDB(ctx context.Context, app *infra.Deps, baitoID string) (models.Baito, error) {
	var baito models.Baito
	err := app.DB.FindOne(ctx, BaitoCollection, bson.M{"baitoid": baitoID}, &baito)
	return baito, err
}

func findMyBaitosFromDB(ctx context.Context, app *infra.Deps, userID string) ([]models.BaitosResponse, error) {
	var baitos []models.BaitosResponse
	err := app.DB.FindManyWithOptions(ctx, BaitoCollection, bson.M{"ownerId": userID}, db.FindManyOptions{
		Sort: bson.D{{Key: "createdAt", Value: -1}},
	}, &baitos)
	return baitos, err
}

func findBaitoApplicantsFromDB(ctx context.Context, app *infra.Deps, baitoID string) ([]bson.M, error) {
	var results []bson.M
	err := app.DB.FindMany(ctx, BaitoAppCollection, bson.M{"baitoid": baitoID}, &results)
	return results, err
}

func findMyApplicationsFromDB(ctx context.Context, app *infra.Deps, userID string) ([]bson.M, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"userid": userID}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         BaitoCollection,
			"localField":   "baitoid",
			"foreignField": "baitoid",
			"as":           "job",
		}}},
		{{Key: "$unwind", Value: "$job"}},
		{{Key: "$project", Value: bson.M{
			"id":          "$_id",
			"pitch":       1,
			"submittedAt": 1,
			"jobId":       "$job.baitoid",
			"title":       "$job.title",
			"location":    "$job.location",
			"wage":        "$job.wage",
		}}},
	}

	var results []bson.M
	err := app.DB.Aggregate(ctx, BaitoAppCollection, pipeline, &results)
	return results, err
}
