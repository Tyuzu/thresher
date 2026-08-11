package ads

import (
	"context"

	"naevis/config"
	"naevis/infra"
	"naevis/python"

	"go.mongodb.org/mongo-driver/bson"
)

var adsCollection = config.Collections.AdsCollection

// FetchActiveAdsFromDB queries active ads using the app.DB interface.
func FetchActiveAdsFromDB(ctx context.Context, app *infra.Deps) ([]python.Ad, error) {
	if app == nil || app.DB == nil {
		return nil, nil
	}

	var dbAds []python.Ad
	// Fetch active ads from the database
	filter := bson.M{"status": bson.M{"$ne": "inactive"}}

	err := app.DB.FindMany(ctx, adsCollection, filter, &dbAds)
	if err != nil {
		return nil, err
	}

	return dbAds, nil
}
