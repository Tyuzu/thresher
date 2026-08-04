package repo

import (
	"context"
	"fmt"
	"time"

	"naevis/config"
	"naevis/infra/db"
	"naevis/models"
	"naevis/tickets/domain"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoTicketRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.TicketRepository {
	return &MongoTicketRepo{db: d}
}

func (m *MongoTicketRepo) CreateTicket(ctx context.Context, ticket models.Ticket) error {
	return m.db.Insert(ctx, config.Collections.TicketsCollection, ticket)
}

func (m *MongoTicketRepo) ListTicketsByEvent(ctx context.Context, eventID string) ([]models.Ticket, error) {
	var tickets []models.Ticket
	if err := m.db.FindMany(ctx, config.Collections.TicketsCollection, bson.M{"eventid": eventID}, &tickets); err != nil {
		return nil, err
	}
	return tickets, nil
}

func (m *MongoTicketRepo) GetTicketByID(ctx context.Context, eventID, ticketID string) (*models.Ticket, error) {
	var ticket models.Ticket
	if err := m.db.FindOne(ctx, config.Collections.TicketsCollection, bson.M{"eventid": eventID, "ticketid": ticketID}, &ticket); err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (m *MongoTicketRepo) UpdateTicket(ctx context.Context, eventID, ticketID string, update any) error {
	return m.db.UpdateOne(ctx, config.Collections.TicketsCollection, bson.M{"eventid": eventID, "ticketid": ticketID}, update)
}

func (m *MongoTicketRepo) DeleteTicket(ctx context.Context, eventID, ticketID string) error {
	_, err := m.db.DeleteOne(ctx, config.Collections.TicketsCollection, bson.M{"eventid": eventID, "ticketid": ticketID})
	return err
}

func (m *MongoTicketRepo) PurchaseTicket(ctx context.Context, eventID, ticketID string, quantity int) (*models.Ticket, error) {
	var ticket models.Ticket
	if err := m.db.FindOneAndUpdate(ctx, config.Collections.TicketsCollection, bson.M{"eventid": eventID, "ticketid": ticketID, "available": bson.M{"$gte": quantity}}, bson.M{"$inc": bson.M{"available": -quantity, "sold": quantity}, "$set": bson.M{"updatedat": time.Now().UTC()}}, &ticket); err != nil {
		return nil, fmt.Errorf("purchase ticket failed: %w", err)
	}
	return &ticket, nil
}

func (m *MongoTicketRepo) InsertBooking(ctx context.Context, booking domain.TicketBooking) error {
	return m.db.Insert(ctx, config.Collections.BookingsCollection, booking)
}

func (m *MongoTicketRepo) InsertPurchasedTickets(ctx context.Context, tickets []models.PurchasedTicket) error {
	return m.db.InsertMany(ctx, config.Collections.PurchasedTicketsCollection, anySlice(tickets))
}

func (m *MongoTicketRepo) ListPurchasedTicketsByUser(ctx context.Context, eventID, userID string) ([]models.PurchasedTicket, error) {
	var tickets []models.PurchasedTicket
	if err := m.db.FindMany(ctx, config.Collections.PurchasedTicketsCollection, bson.M{"eventid": eventID, "userid": userID}, &tickets); err != nil {
		return nil, err
	}
	return tickets, nil
}

func (m *MongoTicketRepo) ListRefundsByCodes(ctx context.Context, eventID, userID string, codes []string) ([]models.RefundRequest, error) {
	var refunds []models.RefundRequest
	if len(codes) == 0 {
		return refunds, nil
	}
	if err := m.db.FindMany(ctx, config.Collections.RefundsCollection, bson.M{"eventid": eventID, "userid": userID, "uniquecode": bson.M{"$in": codes}}, &refunds); err != nil {
		return nil, err
	}
	return refunds, nil
}

func (m *MongoTicketRepo) GetPurchasedTicketByUniqueCode(ctx context.Context, eventID, uniqueCode string) (*models.PurchasedTicket, error) {
	var ticket models.PurchasedTicket
	if err := m.db.FindOne(ctx, config.Collections.PurchasedTicketsCollection, bson.M{"eventid": eventID, "uniquecode": uniqueCode}, &ticket); err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (m *MongoTicketRepo) UpdatePurchasedTicket(ctx context.Context, filter any, update any) error {
	return m.db.Update(ctx, config.Collections.PurchasedTicketsCollection, filter, update)
}

func (m *MongoTicketRepo) CreateRefundRequest(ctx context.Context, refund models.RefundRequest) error {
	return m.db.Insert(ctx, config.Collections.RefundsCollection, refund)
}

func (m *MongoTicketRepo) FindTicketByEvent(ctx context.Context, eventID string) (models.Ticket, error) {
	var ticket models.Ticket
	if err := m.db.FindOne(ctx, config.Collections.TicketsCollection, bson.M{"eventid": eventID}, &ticket); err != nil {
		return models.Ticket{}, err
	}
	return ticket, nil
}

func anySlice[T any](items []T) []any {
	out := make([]any, len(items))
	for i, v := range items {
		out[i] = v
	}
	return out
}
