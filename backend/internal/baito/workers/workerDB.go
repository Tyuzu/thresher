package workers

import (
	"context"
	"errors"
	"naevis/config"
	"naevis/infra"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var BaitoWorkersCollection = config.Collections.BaitoWorkerCollection
var UsersCollection = config.Collections.UserCollection

func findWorkerByIDFromDB(ctx context.Context, app *infra.Deps, workerID string) (BaitoWorker, error) {
	var worker BaitoWorker
	err := app.DB.FindOne(ctx, BaitoWorkersCollection, bson.M{"baitoWorkerId": workerID}, &worker)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return BaitoWorker{}, nil
	}
	return worker, err
}

func getUniqueWorkerSkillsFromDB(ctx context.Context, app *infra.Deps) ([]string, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$unwind", Value: "$preferredRoles"}},
		{{Key: "$group", Value: bson.M{"_id": "$preferredRoles"}}},
		{{Key: "$project", Value: bson.M{"_id": 0, "skill": "$_id"}}},
	}

	var results []bson.M
	err := app.DB.Aggregate(ctx, BaitoWorkersCollection, pipeline, &results)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return []string{}, nil
		}
		return nil, err
	}

	skills := make([]string, 0, len(results))
	for _, r := range results {
		if s, ok := r["skill"].(string); ok && s != "" {
			skills = append(skills, s)
		}
	}

	return skills, nil
}

func findExistingWorkerProfile(ctx context.Context, app *infra.Deps, userID string, result any) error {
	err := app.DB.FindOne(ctx, BaitoWorkersCollection, bson.M{"userId": userID}, result)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	return err
}

func createWorkerProfileRecord(ctx context.Context, app *infra.Deps, worker BaitoWorker) error {
	return app.DB.Insert(ctx, BaitoWorkersCollection, worker)
}

func updateWorkerProfileRecord(ctx context.Context, app *infra.Deps, workerID, userID string, update bson.M) error {
	_, err := app.DB.UpdateOne(ctx, BaitoWorkersCollection, bson.M{
		"baitoWorkerId": workerID,
		"userId":        userID,
	}, update)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	return err
}

func addWorkerRoleToUser(ctx context.Context, app *infra.Deps, userID string) error {
	err := app.DB.AddToSet(ctx, UsersCollection, bson.M{"userid": userID}, "role", "worker")
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	return err
}

func touchUserUpdatedAt(ctx context.Context, app *infra.Deps, userID string) error {
	_, err := app.DB.UpdateOne(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{"updated_at": time.Now()})
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	return err
}
