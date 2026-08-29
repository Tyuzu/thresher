package baito

import (
	"context"
	"errors"

	"scav/config"
	"scav/infra"
	"scav/infra/db"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var UsersCollection = config.Collections.UserCollection
var BaitoCollection = config.Collections.BaitoCollection
var BaitoAppCollection = config.Collections.BaitoApplicationsCollection

func deleteBaitoRecord(ctx context.Context, app *infra.Deps, baitoID, userID string) (int64, error) {
	_, err := app.DB.DeleteOne(ctx, BaitoCollection, bson.M{
		"baitoid": baitoID,
		"ownerid": userID,
	})
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return 0, nil
		}
		return 0, err
	}
	return 0, nil
}

func saveBaitoApplication(ctx context.Context, app *infra.Deps, application BaitoApplication) error {
	return app.DB.Insert(ctx, BaitoAppCollection, application)
}

func incrementBaitoApplicationCount(ctx context.Context, app *infra.Deps, baitoID string) error {
	err := app.DB.Inc(ctx, BaitoCollection, bson.M{"baitoid": baitoID}, "applicationcount", 1)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	return err
}

func createBaitoRecord(ctx context.Context, app *infra.Deps, baito Baito) error {
	return app.DB.Insert(ctx, BaitoCollection, baito)
}

func updateBaitoRecord(ctx context.Context, app *infra.Deps, baitoID, userID string, update bson.M) (int64, error) {
	_, err := app.DB.UpdateOne(ctx, BaitoCollection, bson.M{
		"baitoid": baitoID,
		"ownerid": userID,
	}, update)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return 0, nil
	}
	return 0, err
}

func findLatestBaitosFromDB(ctx context.Context, app *infra.Deps, filter any, limit int) ([]BaitosResponse, error) {
	var baitos []BaitosResponse
	err := app.DB.FindManyWithOptions(ctx, BaitoCollection, filter, db.FindManyOptions{
		Limit: limit,
		Sort:  bson.D{{Key: "createdAt", Value: -1}},
	}, &baitos)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return []BaitosResponse{}, nil
	}
	return baitos, err
}

func findRelatedBaitosFromDB(ctx context.Context, app *infra.Deps, filter any, limit int) ([]BaitosResponse, error) {
	var baitos []BaitosResponse
	err := app.DB.FindManyWithOptions(ctx, BaitoCollection, filter, db.FindManyOptions{
		Limit: limit,
		Sort:  bson.D{{Key: "createdAt", Value: -1}},
	}, &baitos)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return []BaitosResponse{}, nil
	}
	return baitos, err
}

func findBaitoByIDFromDB(ctx context.Context, app *infra.Deps, baitoID string) (Baito, error) {
	var baito Baito
	err := app.DB.FindOne(ctx, BaitoCollection, bson.M{"baitoid": baitoID}, &baito)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return Baito{}, nil
	}
	return baito, err
}

func findMyBaitosFromDB(ctx context.Context, app *infra.Deps, userID string) ([]BaitosResponse, error) {
	var baitos []BaitosResponse
	err := app.DB.FindManyWithOptions(ctx, BaitoCollection, bson.M{"ownerId": userID}, db.FindManyOptions{
		Sort: bson.D{{Key: "createdAt", Value: -1}},
	}, &baitos)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return []BaitosResponse{}, nil
	}
	return baitos, err
}

func findBaitoApplicantsFromDB(ctx context.Context, app *infra.Deps, baitoID string) ([]bson.M, error) {
	var results []bson.M
	err := app.DB.FindMany(ctx, BaitoAppCollection, bson.M{"baitoid": baitoID}, &results)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return []bson.M{}, nil
	}
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
	if errors.Is(err, mongo.ErrNoDocuments) {
		return []bson.M{}, nil
	}
	return results, err
}
