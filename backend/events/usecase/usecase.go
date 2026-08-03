package usecase

import (
	"context"

	"naevis/events/domain"
	"naevis/models"
)

type EventUsecase struct {
	repo domain.EventRepository
}

func NewEventUsecase(r domain.EventRepository) *EventUsecase {
	return &EventUsecase{repo: r}
}

func (u *EventUsecase) CreateEvent(ctx context.Context, ev models.Event) error {
	return u.repo.InsertEvent(ctx, ev)
}

func (u *EventUsecase) UpdateEvent(ctx context.Context, eventID string, updates map[string]any) error {
	return u.repo.UpdateEvent(ctx, eventID, updates)
}

func (u *EventUsecase) FindEvent(ctx context.Context, eventID string) (*models.Event, error) {
	return u.repo.FindEventByID(ctx, eventID)
}

func (u *EventUsecase) AddFAQ(ctx context.Context, eventID string, faq models.FAQ) error {
	return u.repo.AddFAQToEvent(ctx, eventID, faq)
}
