package usecase

import (
	"context"
	"fmt"
	"time"

	"naevis/infra/mq"
	"naevis/models"
	"naevis/tickets/domain"
)

type TicketUseCase struct {
	repo domain.TicketRepository
	mq   mq.MQ
}

type TicketUsecase = TicketUseCase

func NewTicketUsecase(r domain.TicketRepository, mqclient mq.MQ) *TicketUseCase {
	return &TicketUseCase{repo: r, mq: mqclient}
}

func NewTicketUseCase(r domain.TicketRepository, mqclient mq.MQ) *TicketUseCase {
	return NewTicketUsecase(r, mqclient)
}

func (u *TicketUseCase) CreateTicket(ctx context.Context, ticket models.Ticket) error {
	return u.repo.CreateTicket(ctx, ticket)
}

func (u *TicketUseCase) CreateTicketFromInput(ctx context.Context, eventID, ownerID string, input domain.TicketCreateInput) (models.Ticket, error) {
	if err := input.Validate(); err != nil {
		return models.Ticket{}, err
	}
	if err := domain.ValidateTicketOwnership(eventID, ownerID, ownerID); err != nil {
		return models.Ticket{}, err
	}

	ticket := input.ToTicket(eventID, fmt.Sprintf("ticket-%s-%d", eventID, time.Now().UnixNano()), time.Now().UTC())
	if err := u.repo.CreateTicket(ctx, ticket); err != nil {
		return models.Ticket{}, err
	}
	return ticket, nil
}

func (u *TicketUseCase) UpdateTicket(ctx context.Context, eventID, ticketID string, update any) error {
	return u.repo.UpdateTicket(ctx, eventID, ticketID, update)
}

func (u *TicketUseCase) DeleteTicket(ctx context.Context, eventID, ticketID string) error {
	return u.repo.DeleteTicket(ctx, eventID, ticketID)
}

func (u *TicketUseCase) ListTicketsByEvent(ctx context.Context, eventID string) ([]models.Ticket, error) {
	return u.repo.ListTicketsByEvent(ctx, eventID)
}

func (u *TicketUseCase) GetTicketByID(ctx context.Context, eventID, ticketID string) (*models.Ticket, error) {
	return u.repo.GetTicketByID(ctx, eventID, ticketID)
}

func (u *TicketUseCase) PurchaseTicket(ctx context.Context, eventID, ticketID string, quantity int) (*models.Ticket, error) {
	return u.repo.PurchaseTicket(ctx, eventID, ticketID, quantity)
}

func (u *TicketUseCase) InsertBooking(ctx context.Context, booking domain.TicketBooking) error {
	return u.repo.InsertBooking(ctx, booking)
}

func (u *TicketUseCase) InsertPurchasedTickets(ctx context.Context, tickets []models.PurchasedTicket) error {
	return u.repo.InsertPurchasedTickets(ctx, tickets)
}

func (u *TicketUseCase) PurchaseAndRecord(ctx context.Context, eventID, ticketID, userID string, quantity int) ([]string, error) {
	ticket, err := u.repo.PurchaseTicket(ctx, eventID, ticketID, quantity)
	if err != nil {
		return nil, err
	}

	codes := make([]string, quantity)
	for i := 0; i < quantity; i++ {
		codes[i] = fmt.Sprintf("%s-%s-%d", ticketID, userID, time.Now().UnixNano()+int64(i))
	}

	booking := domain.TicketBooking{
		BookingID: fmt.Sprintf("booking-%s-%s", ticketID, userID),
		EventID:   eventID,
		TicketID:  ticketID,
		UserID:    userID,
		Quantity:  quantity,
		BookedAt:  time.Now().UTC(),
	}

	if err := u.repo.InsertBooking(ctx, booking); err != nil {
		return nil, err
	}

	purchased := make([]models.PurchasedTicket, 0, len(codes))
	for _, code := range codes {
		purchased = append(purchased, models.PurchasedTicket{
			EventID:      eventID,
			TicketID:     ticketID,
			UserID:       userID,
			UniqueCode:   code,
			PurchaseDate: time.Now().UTC(),
			Price:        int(ticket.Price),
		})
	}

	if err := u.repo.InsertPurchasedTickets(ctx, purchased); err != nil {
		return nil, err
	}

	return codes, nil
}

func (u *TicketUseCase) ListMyTickets(ctx context.Context, eventID, userID string) ([]models.PurchasedTicket, error) {
	return u.repo.ListPurchasedTicketsByUser(ctx, eventID, userID)
}

func (u *TicketUseCase) ListRefundsByCodes(ctx context.Context, eventID, userID string, codes []string) ([]models.RefundRequest, error) {
	return u.repo.ListRefundsByCodes(ctx, eventID, userID, codes)
}

func (u *TicketUseCase) GetPurchasedTicketByUniqueCode(ctx context.Context, eventID, uniqueCode string) (*models.PurchasedTicket, error) {
	return u.repo.GetPurchasedTicketByUniqueCode(ctx, eventID, uniqueCode)
}

func (u *TicketUseCase) UpdatePurchasedTicket(ctx context.Context, filter any, update any) error {
	return u.repo.UpdatePurchasedTicket(ctx, filter, update)
}

func (u *TicketUseCase) CreateRefundRequest(ctx context.Context, refund models.RefundRequest) error {
	return u.repo.CreateRefundRequest(ctx, refund)
}

func (u *TicketUseCase) FindTicketByEvent(ctx context.Context, eventID string) (models.Ticket, error) {
	return u.repo.FindTicketByEvent(ctx, eventID)
}
