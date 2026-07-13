package booking

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
	"naevis/infra/db"
	"naevis/models"
)

var (
	slotsCollection    = config.Collections.SlotCollection
	bookingsCollection = config.Collections.BookingsCollection
	dateCapsCollection = config.Collections.DateCapsCollection
	tiersCollection    = config.Collections.TiersCollection
)

// DB helper wrappers for booking package. Keeps all Mongo interactions here.

func FindSlots(ctx context.Context, d db.Database, filter any, result any) error {
	return d.FindMany(ctx, slotsCollection, filter, result)
}

func FindBookings(ctx context.Context, d db.Database, filter any, result any) error {
	return d.FindMany(ctx, bookingsCollection, filter, result)
}

func FindTiers(ctx context.Context, d db.Database, filter any, result any) error {
	return d.FindMany(ctx, tiersCollection, filter, result)
}

func CountBookings(ctx context.Context, d db.Database, filter any) (int64, error) {
	return d.CountDocuments(ctx, bookingsCollection, filter)
}

func FindSlotByID(ctx context.Context, d db.Database, id string, out *models.Slot) error {
	return d.FindOne(ctx, slotsCollection, bson.M{"id": id}, out)
}

func FindTierByID(ctx context.Context, d db.Database, id string, out *models.Tier) error {
	return d.FindOne(ctx, tiersCollection, bson.M{"id": id}, out)
}

func FindDateCap(ctx context.Context, d db.Database, entityType, entityId, date string, out *models.DateCap) error {
	return d.FindOne(ctx, dateCapsCollection, bson.M{"entityType": entityType, "entityId": entityId, "date": date}, out)
}

func FindVendorAvailability(ctx context.Context, d db.Database, vendorId string, date string, out any) error {
	return d.FindMany(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"vendorid": vendorId, "start_date": bson.M{"$lte": date}, "end_date": bson.M{"$gte": date}}, out)
}

func InsertBooking(ctx context.Context, d db.Database, b models.Booking) error {
	return d.InsertOne(ctx, bookingsCollection, b)
}

func UpdateBookingStatusByID(ctx context.Context, d db.Database, bookingID string, update any, out *models.Booking) error {
	return d.FindOneAndUpdate(ctx, bookingsCollection, bson.M{"id": bookingID}, update, out)
}

func UpdateDateCapacity(ctx context.Context, d db.Database, entityType, entityId, date string, payload any) error {
	return d.UpdateOne(ctx, dateCapsCollection, bson.M{"entityType": entityType, "entityId": entityId, "date": date}, payload)
}

func DeleteSlotByID(ctx context.Context, d db.Database, slotID string) (int64, error) {
	return d.DeleteOne(ctx, slotsCollection, map[string]any{"id": slotID})
}

func DeleteBookingsBySlot(ctx context.Context, d db.Database, slotID string) error {
	return d.DeleteMany(ctx, bookingsCollection, map[string]any{"slotId": slotID})
}

func InsertSlotsMany(ctx context.Context, d db.Database, docs []any) error {
	return d.InsertMany(ctx, slotsCollection, docs)
}

func InsertTier(ctx context.Context, d db.Database, t models.Tier) error {
	return d.InsertOne(ctx, tiersCollection, t)
}

func DeleteTierByID(ctx context.Context, d db.Database, tierID string) (int64, error) {
	return d.DeleteOne(ctx, tiersCollection, map[string]any{"id": tierID})
}

func InsertSlot(ctx context.Context, d db.Database, s models.Slot) error {
	return d.InsertOne(ctx, slotsCollection, s)
}
