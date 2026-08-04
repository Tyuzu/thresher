package usecase

import (
	"context"
	"testing"

	"naevis/tickets/domain"
)

func TestTicketUsecase_CreateTicketFromInput_RejectsInvalidPayload(t *testing.T) {
	uc := &TicketUseCase{}

	_, err := uc.CreateTicketFromInput(context.Background(), "event-1", "owner-1", domain.TicketCreateInput{})
	if err == nil {
		t.Fatal("expected validation error for empty payload")
	}
}
