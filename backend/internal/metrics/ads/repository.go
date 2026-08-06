package ads

import (
	"context"

	"naevis/config"
	"naevis/infra"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var adsCollection = config.Collections.AdsCollection

// FetchActiveAdsFromDB queries active ads using the app.DB interface
func FetchActiveAdsFromDB(ctx context.Context, app *infra.Deps) ([]models.Ad, error) {
	if app == nil || app.DB == nil {
		return nil, nil
	}

	var dbAds []models.Ad
	// Querying active ads from the 'ads' collection
	filter := bson.M{} // Replace with active filter if needed e.g., bson.M{"status": "active"}

	err := app.DB.FindMany(ctx, adsCollection, filter, &dbAds)
	if err != nil {
		return nil, err
	}

	return dbAds, nil
}
