package events

import (
	"context"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
	"naevis/utils"
)

var eventsCollection = config.Collections.EventsCollection

func insertEvent(ctx context.Context, app *infra.Deps, event models.Event) error {
	return app.DB.Insert(ctx, eventsCollection, event)
}

func ensureUniqueEventID(ctx context.Context, app *infra.Deps, event *models.Event) {
	if event == nil {
		return
	}

	event.EventID = utils.GenerateRandomString(14)
	var existingEvent models.Event
	if err := app.DB.FindOne(ctx, eventsCollection, map[string]string{"eventid": event.EventID}, &existingEvent); err == nil {
		event.EventID = utils.GenerateRandomString(14)
	}
}

func findEventByID(ctx context.Context, app *infra.Deps, eventID string, event *models.Event) error {
	return app.DB.FindOne(ctx, eventsCollection, map[string]string{"eventid": eventID}, event)
}

func updateEvent(ctx context.Context, app *infra.Deps, eventID string, updates map[string]any) error {
	return app.DB.UpdateOne(ctx, eventsCollection, map[string]string{"eventid": eventID}, map[string]any{"$set": updates})
}

func aggregateEvent(ctx context.Context, app *infra.Deps, eventID string, result *[]models.Event) error {
	pipeline := []any{
		map[string]any{"$match": map[string]any{"eventid": eventID}},
		map[string]any{"$lookup": map[string]any{
			"from":         "ticks",
			"localField":   "eventid",
			"foreignField": "eventid",
			"as":           "tickets",
		}},
		map[string]any{"$lookup": map[string]any{
			"from": "media",
			"let":  map[string]any{"eid": "$eventid"},
			"pipeline": []any{
				map[string]any{"$match": map[string]any{
					"$expr": map[string]any{
						"$and": []any{
							map[string]any{"$eq": []any{"$entityid", "$$eid"}},
							map[string]any{"$eq": []any{"$entitytype", "event"}},
						},
					},
				}},
			},
			"as": "media",
		}},
		map[string]any{"$lookup": map[string]any{
			"from": "merch",
			"let":  map[string]any{"eid": "$eventid"},
			"pipeline": []any{
				map[string]any{"$match": map[string]any{
					"$expr": map[string]any{
						"$and": []any{
							map[string]any{"$eq": []any{"$entity_id", "$$eid"}},
							map[string]any{"$eq": []any{"$entity_type", "event"}},
						},
					},
				}},
			},
			"as": "merch",
		}},
	}

	return app.DB.Aggregate(ctx, eventsCollection, pipeline, result)
}

func listEvents(ctx context.Context, app *infra.Deps, filter map[string]any, opts db.FindManyOptions, result *[]models.Event) error {
	return app.DB.FindManyWithOptions(ctx, eventsCollection, filter, opts, result)
}

func countEvents(ctx context.Context, app *infra.Deps, filter map[string]any) (int64, error) {
	return app.DB.CountDocuments(ctx, eventsCollection, filter)
}

func addFAQToEvent(ctx context.Context, app *infra.Deps, eventID string, faq models.FAQ) error {
	return app.DB.AddToSet(ctx, eventsCollection, map[string]string{"eventid": eventID}, "faqs", faq)
}
