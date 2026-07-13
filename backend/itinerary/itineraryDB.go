package itinerary

import (
	"context"
	"naevis/config"
	"naevis/infra"
	"naevis/models"
)

var ItineraryCollection = config.Collections.ItineraryCollection

func insertItinerary(ctx context.Context, app *infra.Deps, itinerary models.Itinerary) error {
	return app.DB.Insert(ctx, ItineraryCollection, itinerary)
}

func findItineraryByID(ctx context.Context, app *infra.Deps, itineraryID string) (models.Itinerary, error) {
	var itinerary models.Itinerary
	err := app.DB.FindOne(ctx, ItineraryCollection, map[string]any{
		"itineraryid": itineraryID,
		"deleted":     map[string]any{"$ne": true},
	}, &itinerary)
	if err != nil {
		return models.Itinerary{}, err
	}
	return itinerary, nil
}

func findItineraries(ctx context.Context, app *infra.Deps, filter map[string]any) ([]models.Itinerary, error) {
	var itineraries []models.Itinerary
	err := app.DB.FindMany(ctx, ItineraryCollection, filter, &itineraries)
	if err != nil {
		return nil, err
	}
	return itineraries, nil
}

func updateItineraryFields(ctx context.Context, app *infra.Deps, itineraryID string, update map[string]any) error {
	return app.DB.UpdateOne(ctx, ItineraryCollection, map[string]any{"itineraryid": itineraryID}, update)
}

func softDeleteItinerary(ctx context.Context, app *infra.Deps, itineraryID, userID string) error {
	update := map[string]any{"$set": map[string]any{"deleted": true}}
	return app.DB.UpdateOne(ctx, ItineraryCollection, map[string]any{"itineraryid": itineraryID, "userid": userID}, update)
}

func publishItinerary(ctx context.Context, app *infra.Deps, itineraryID, userID string) error {
	update := map[string]any{"$set": map[string]any{"published": true}}
	return app.DB.UpdateOne(ctx, ItineraryCollection, map[string]any{"itineraryid": itineraryID, "userid": userID}, update)
}
