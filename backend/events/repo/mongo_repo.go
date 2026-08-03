package repo

import (
	"context"
	"fmt"

	"naevis/config"
	"naevis/events/domain"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoEventRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.EventRepository {
	return &MongoEventRepo{db: d}
}

func (m *MongoEventRepo) InsertEvent(ctx context.Context, ev models.Event) error {
	return m.db.Insert(ctx, config.Collections.EventsCollection, ev)
}

func (m *MongoEventRepo) EnsureUniqueEventID(ctx context.Context, ev *models.Event) error {
	// reuse existing db logic: generate and check loop should be implemented here.
	return nil
}

func (m *MongoEventRepo) FindEventByID(ctx context.Context, eventID string) (*models.Event, error) {
	var ev models.Event
	if err := m.db.FindOne(ctx, config.Collections.EventsCollection, bson.M{"eventid": eventID}, &ev); err != nil {
		return nil, err
	}
	return &ev, nil
}

func (m *MongoEventRepo) UpdateEvent(ctx context.Context, eventID string, updates map[string]any) error {
	return m.db.UpdateOne(ctx, config.Collections.EventsCollection, bson.M{"eventid": eventID}, updates)
}

func (m *MongoEventRepo) AggregateEvent(ctx context.Context, eventID string) (*models.Event, error) {
	// For now, delegate to existing application-level aggregate logic by querying the aggregate pipeline
	// This placeholder returns error to force caller to use legacy AggregateEvent if needed.
	return nil, fmt.Errorf("AggregateEvent not implemented in repo")
}

func (m *MongoEventRepo) ListEvents(ctx context.Context, filter map[string]any, opts map[string]any) ([]models.Event, error) {
	// Not implemented here; keep using existing ListEvents for now
	return nil, fmt.Errorf("ListEvents not implemented in repo")
}

func (m *MongoEventRepo) CountEvents(ctx context.Context, filter map[string]any) (int64, error) {
	return 0, fmt.Errorf("CountEvents not implemented in repo")
}

func (m *MongoEventRepo) AddFAQToEvent(ctx context.Context, eventID string, faq models.FAQ) error {
	return m.db.AddToSet(ctx, config.Collections.EventsCollection, bson.M{"eventid": eventID}, "faqs", faq)
}
