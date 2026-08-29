package ads

import (
	"context"
	"fmt"
	"time"

	"scav/config"
	"scav/infra"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	adsCollection   = config.Collections.AdsCollection
	postsCollection = config.Collections.FarmsCollection
)

func FetchActiveAdsFromDB(ctx context.Context, app *infra.Deps) ([]Ad, error) {
	if app == nil || app.DB == nil {
		return nil, nil
	}

	var dbAds []Ad
	filter := bson.M{"status": "active"}

	err := app.DB.FindMany(ctx, adsCollection, filter, &dbAds)
	if err != nil {
		return nil, err
	}

	return dbAds, nil
}

func CreateAdInDB(ctx context.Context, app *infra.Deps, ad *Ad) error {
	ad.CreatedAt = time.Now()
	ad.UpdatedAt = time.Now()

	if ad.Status == "" {
		ad.Status = "active"
	}
	if ad.Type == "" {
		ad.Type = TypeExternal
	}

	return app.DB.InsertOne(ctx, adsCollection, ad)
}

// PromotePost creates an Ad entry sourced directly from an existing post.
func PromotePostInDB(ctx context.Context, app *infra.Deps, postID, page, position, category string) (*Ad, error) {
	objID, err := primitive.ObjectIDFromHex(postID)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID format")
	}

	// Fetch target post to derive ad details
	var post struct {
		ID       string `bson:"_id"`
		Title    string `bson:"title"`
		Summary  string `bson:"summary"`
		CoverImg string `bson:"coverImage"`
		Category string `bson:"category"`
	}

	err = app.DB.FindOne(ctx, postsCollection, bson.M{"_id": objID}, &post)
	if err != nil {
		return nil, fmt.Errorf("post not found: %w", err)
	}

	if category == "" {
		category = post.Category
	}

	ad := &Ad{
		Type:        TypePost,
		PostID:      postID,
		Title:       post.Title,
		Description: post.Summary,
		Image:       post.CoverImg,
		Link:        fmt.Sprintf("/posts/%s", postID), // Internal client routing path
		Category:    category,
		Page:        page,
		Position:    position,
		Status:      "active",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err = app.DB.InsertOne(ctx, adsCollection, ad)
	if err != nil {
		return nil, err
	}

	return ad, nil
}

func GetAdByIDFromDB(ctx context.Context, app *infra.Deps, id string) (*Ad, error) {
	var ad Ad
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = app.DB.FindOne(ctx, adsCollection, bson.M{"_id": objID}, &ad)
	if err != nil {
		return nil, err
	}

	return &ad, nil
}

func UpdateAdInDB(ctx context.Context, app *infra.Deps, id string, updateData map[string]interface{}) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	updateData["updatedAt"] = time.Now()
	update := bson.M{"$set": updateData}
	_, err = app.DB.UpdateOne(ctx, adsCollection, bson.M{"_id": objID}, update)
	return err
}

func DeleteAdInDB(ctx context.Context, app *infra.Deps, id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = app.DB.DeleteOne(ctx, adsCollection, bson.M{"_id": objID})

	return err
}
