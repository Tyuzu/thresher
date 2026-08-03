package domain

import (
	"context"

	"naevis/models"
)

// EventRepository defines persistence operations required by events usecases.
type EventRepository interface {
	InsertEvent(ctx context.Context, ev models.Event) error
	EnsureUniqueEventID(ctx context.Context, ev *models.Event) error
	FindEventByID(ctx context.Context, eventID string) (*models.Event, error)
	UpdateEvent(ctx context.Context, eventID string, updates map[string]any) error
	AggregateEvent(ctx context.Context, eventID string) (*models.Event, error)
	ListEvents(ctx context.Context, filter map[string]any, opts map[string]any) ([]models.Event, error)
	CountEvents(ctx context.Context, filter map[string]any) (int64, error)
	AddFAQToEvent(ctx context.Context, eventID string, faq models.FAQ) error
}
