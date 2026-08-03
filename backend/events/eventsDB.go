package events

import (
	"context"
	"errors"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
	"naevis/utils"
)

func collection() string {
	return config.Collections.EventsCollection
}

// InsertEvent creates a new event document in the database.
func InsertEvent(ctx context.Context, app *infra.Deps, event models.Event) error {
	if err := app.DB.Insert(ctx, collection(), event); err != nil {
		return fmt.Errorf("insert event: %w", err)
	}
	return nil
}

// EnsureUniqueEventID generates a random event ID and verifies uniqueness in DB.
func EnsureUniqueEventID(ctx context.Context, app *infra.Deps, event *models.Event) error {
	if event == nil {
		return nil
	}

	const maxAttempts = 5
	for range maxAttempts {
		genID, err := utils.GenerateRandomString(14)
		if err != nil {
			return fmt.Errorf("generate random string: %w", err)
		}

		filter := bson.M{"eventid": genID}
		var existing models.Event
		err = app.DB.FindOne(ctx, collection(), filter, &existing)
		if errors.Is(err, mongo.ErrNoDocuments) {
			event.EventID = genID
			return nil
		}
		if err != nil {
			return fmt.Errorf("check existing event id: %w", err)
		}
	}

	return fmt.Errorf("failed to generate unique event ID after %d attempts", maxAttempts)
}

// FindEventByID retrieves a single event by its unique ID.
func FindEventByID(ctx context.Context, app *infra.Deps, eventID string) (*models.Event, error) {
	var event models.Event
	filter := bson.M{"eventid": eventID}

	if err := app.DB.FindOne(ctx, collection(), filter, &event); err != nil {
		return nil, fmt.Errorf("find event by id %s: %w", eventID, err)
	}
	return &event, nil
}

// UpdateEvent updates fields on a specific event document.
func UpdateEvent(ctx context.Context, app *infra.Deps, eventID string, updates bson.M) error {
	filter := bson.M{"eventid": eventID}
	update := bson.M{"$set": updates}

	if err := app.DB.UpdateOne(ctx, collection(), filter, update); err != nil {
		return fmt.Errorf("update event %s: %w", eventID, err)
	}
	return nil
}

// AggregateEvent retrieves a single event populated with related tickets, media, and merch.
func AggregateEvent(ctx context.Context, app *infra.Deps, eventID string) (*models.Event, error) {
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"eventid": eventID}}},
		bson.D{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "ticks"},
			{Key: "localField", Value: "eventid"},
			{Key: "foreignField", Value: "eventid"},
			{Key: "as", Value: "tickets"},
		}}},
		bson.D{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "media"},
			{Key: "let", Value: bson.M{"eid": "$eventid"}},
			{Key: "pipeline", Value: mongo.Pipeline{
				bson.D{{Key: "$match", Value: bson.D{
					{Key: "$expr", Value: bson.D{
						{Key: "$and", Value: bson.A{
							bson.D{{Key: "$eq", Value: bson.A{"$entityid", "$$eid"}}},
							bson.D{{Key: "$eq", Value: bson.A{"$entitytype", "event"}}},
						}},
					}},
				}}},
			}},
			{Key: "as", Value: "media"},
		}}},
		bson.D{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "merch"},
			{Key: "let", Value: bson.M{"eid": "$eventid"}},
			{Key: "pipeline", Value: mongo.Pipeline{
				bson.D{{Key: "$match", Value: bson.D{
					{Key: "$expr", Value: bson.D{
						{Key: "$and", Value: bson.A{
							bson.D{{Key: "$eq", Value: bson.A{"$entity_id", "$$eid"}}},
							bson.D{{Key: "$eq", Value: bson.A{"$entity_type", "event"}}},
						}},
					}},
				}}},
			}},
			{Key: "as", Value: "merch"},
		}}},
	}

	var results []models.Event
	if err := app.DB.Aggregate(ctx, collection(), pipeline, &results); err != nil {
		return nil, fmt.Errorf("aggregate event %s: %w", eventID, err)
	}
	if len(results) == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return &results[0], nil
}

// ListEvents searches for event records matching specified query filters and options.
func ListEvents(ctx context.Context, app *infra.Deps, filter bson.M, opts db.FindManyOptions) ([]models.Event, error) {
	var events []models.Event
	if err := app.DB.FindManyWithOptions(ctx, collection(), filter, opts, &events); err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	return events, nil
}

// CountEvents counts total matching event documents for given criteria.
func CountEvents(ctx context.Context, app *infra.Deps, filter bson.M) (int64, error) {
	count, err := app.DB.CountDocuments(ctx, collection(), filter)
	if err != nil {
		return 0, fmt.Errorf("count events: %w", err)
	}
	return count, nil
}

// AddFAQToEvent appends a new FAQ entry to an existing event document's faqs slice.
func AddFAQToEvent(ctx context.Context, app *infra.Deps, eventID string, faq models.FAQ) error {
	filter := bson.M{"eventid": eventID}
	if err := app.DB.AddToSet(ctx, collection(), filter, "faqs", faq); err != nil {
		return fmt.Errorf("add faq to event %s: %w", eventID, err)
	}
	return nil
}
