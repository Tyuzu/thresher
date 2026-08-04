package domain

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"naevis/models"
)

type TicketBooking struct {
	BookingID string    `json:"bookingid" bson:"bookingid"`
	EventID   string    `json:"eventid" bson:"eventid"`
	TicketID  string    `json:"ticketid" bson:"ticketid"`
	UserID    string    `json:"userid" bson:"userid"`
	Quantity  int       `json:"quantity" bson:"quantity"`
	BookedAt  time.Time `json:"bookedat" bson:"bookedat"`
}

type TicketCreateInput struct {
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	Currency  string  `json:"currency"`
	Quantity  int     `json:"quantity"`
	Color     string  `json:"color"`
	SeatStart int     `json:"seatstart"`
	SeatEnd   int     `json:"seatend"`
}

func (i TicketCreateInput) Validate() error {
	if strings.TrimSpace(i.Name) == "" {
		return errors.New("ticket name is required")
	}
	if strings.TrimSpace(i.Currency) == "" {
		return errors.New("currency is required")
	}
	if strings.TrimSpace(i.Color) == "" {
		return errors.New("ticket color is required")
	}
	if i.Price <= 0 {
		return errors.New("ticket price must be greater than zero")
	}
	if i.Quantity < 0 {
		return errors.New("ticket quantity cannot be negative")
	}
	if i.SeatStart < 0 {
		return errors.New("seat start cannot be negative")
	}
	if i.SeatEnd < i.SeatStart {
		return errors.New("seat end must be greater than or equal to seat start")
	}
	return nil
}

func (i TicketCreateInput) ToTicket(eventID, ticketID string, now time.Time) models.Ticket {
	return models.Ticket{
		TicketID:   ticketID,
		EventID:    eventID,
		EntityID:   eventID,
		EntityType: "event",
		Name:       strings.TrimSpace(i.Name),
		Price:      int64(i.Price * 100),
		Currency:   strings.TrimSpace(i.Currency),
		Color:      strings.TrimSpace(i.Color),
		Quantity:   i.Quantity,
		Available:  i.Quantity,
		Total:      i.Quantity,
		SeatStart:  i.SeatStart,
		SeatEnd:    i.SeatEnd,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

type TicketRepository interface {
	CreateTicket(ctx context.Context, ticket models.Ticket) error
	ListTicketsByEvent(ctx context.Context, eventID string) ([]models.Ticket, error)
	GetTicketByID(ctx context.Context, eventID, ticketID string) (*models.Ticket, error)
	UpdateTicket(ctx context.Context, eventID, ticketID string, update any) error
	DeleteTicket(ctx context.Context, eventID, ticketID string) error

	PurchaseTicket(ctx context.Context, eventID, ticketID string, quantity int) (*models.Ticket, error)
	InsertBooking(ctx context.Context, booking TicketBooking) error
	InsertPurchasedTickets(ctx context.Context, tickets []models.PurchasedTicket) error

	ListPurchasedTicketsByUser(ctx context.Context, eventID, userID string) ([]models.PurchasedTicket, error)
	ListRefundsByCodes(ctx context.Context, eventID, userID string, codes []string) ([]models.RefundRequest, error)
	GetPurchasedTicketByUniqueCode(ctx context.Context, eventID, uniqueCode string) (*models.PurchasedTicket, error)
	UpdatePurchasedTicket(ctx context.Context, filter any, update any) error
	CreateRefundRequest(ctx context.Context, refund models.RefundRequest) error
	FindTicketByEvent(ctx context.Context, eventID string) (models.Ticket, error)
}

func ValidateTicketOwnership(eventID, ownerID, creatorID string) error {
	if strings.TrimSpace(eventID) == "" {
		return fmt.Errorf("event id is required")
	}
	if strings.TrimSpace(ownerID) == "" {
		return fmt.Errorf("user id is required")
	}
	if strings.TrimSpace(creatorID) == "" {
		return fmt.Errorf("event creator id is required")
	}
	if ownerID != creatorID {
		return fmt.Errorf("forbidden: only event owner can modify tickets")
	}
	return nil
}
