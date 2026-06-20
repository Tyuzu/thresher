package booking

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
	"naevis/infra"
	"naevis/models"
)

// ---------- Bookings ----------

func CreateBooking(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		var p models.Booking
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		if p.UserId == "" || p.EntityType == "" || p.EntityId == "" || p.Date == "" || p.Start == "" {
			http.Error(w, "missing fields", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if p.EntityType == "vendor" {
			var unavailable []models.AvailabilitySlot
			if err := app.DB.FindMany(ctx, config.Collections.VendorAvailabilityCollection, bson.M{
				"vendorid":   p.EntityId,
				"start_date": bson.M{"$lte": p.Date},
				"end_date":   bson.M{"$gte": p.Date},
			}, &unavailable); err != nil {
				http.Error(w, "db error", http.StatusInternalServerError)
				return
			}

			if len(unavailable) > 0 {
				_ = json.NewEncoder(w).Encode(map[string]any{
					"ok":     false,
					"reason": "vendor-unavailable",
				})
				return
			}
		}

		// one booking per user per date (excluding cancelled)
		count, err := app.DB.CountDocuments(ctx, bookingsCollection, bson.M{
			"entityType": p.EntityType,
			"entityId":   p.EntityId,
			"userId":     p.UserId,
			"date":       p.Date,
			"status":     bson.M{"$ne": "cancelled"},
		})
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if count > 0 {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"ok":     false,
				"reason": "one-per-day",
			})
			return
		}

		// SLOT-BASED booking
		if p.SlotId != "" {
			var slot models.Slot
			if err := app.DB.FindOne(ctx, slotsCollection, bson.M{"id": p.SlotId}, &slot); err != nil {
				_ = json.NewEncoder(w).Encode(map[string]any{
					"ok":     false,
					"reason": "slot-missing",
				})
				return
			}

			// Sum seats for this slot (consider seats per booking), not just count documents
			var slotBookings []models.Booking
			if err := app.DB.FindMany(ctx, bookingsCollection, bson.M{
				"entityType": p.EntityType,
				"entityId":   p.EntityId,
				"slotId":     p.SlotId,
				"status":     bson.M{"$ne": "cancelled"},
			}, &slotBookings); err != nil {
				http.Error(w, "db error", http.StatusInternalServerError)
				return
			}

			bookedSeats := 0
			for _, sb := range slotBookings {
				bookedSeats += sb.Seats
			}

			if bookedSeats >= slot.Capacity {
				_ = json.NewEncoder(w).Encode(map[string]any{
					"ok":     false,
					"reason": "slot-full",
				})
				return
			}

			if slot.TierId != "" {
				p.TierId = slot.TierId
				p.TierName = slot.TierName
			}
		}

		// TIER-BASED booking
		if p.SlotId == "" && p.TierId != "" {
			var tier models.Tier
			if err := app.DB.FindOne(ctx, tiersCollection, bson.M{"id": p.TierId}, &tier); err != nil {
				_ = json.NewEncoder(w).Encode(map[string]any{
					"ok":     false,
					"reason": "tier-missing",
				})
				return
			}

			// Sum seats booked for this tier on the date
			var tierBookings []models.Booking
			if err := app.DB.FindMany(ctx, bookingsCollection, bson.M{
				"entityType": p.EntityType,
				"entityId":   p.EntityId,
				"tierId":     p.TierId,
				"date":       p.Date,
				"status":     bson.M{"$ne": "cancelled"},
			}, &tierBookings); err != nil {
				http.Error(w, "db error", http.StatusInternalServerError)
				return
			}

			tierBookedSeats := 0
			for _, tb := range tierBookings {
				tierBookedSeats += tb.Seats
			}

			if tierBookedSeats >= tier.Capacity {
				_ = json.NewEncoder(w).Encode(map[string]any{
					"ok":     false,
					"reason": "tier-full",
				})
				return
			}

			p.TierName = tier.Name
			if p.PricePaid == 0 {
				p.PricePaid = tier.Price
			}
		}

		// DATE capacity (no slot, no tier)
		if p.SlotId == "" && p.TierId == "" {
			var dc models.DateCap
			if err := app.DB.FindOne(ctx, dateCapsCollection, bson.M{
				"entityType": p.EntityType,
				"entityId":   p.EntityId,
				"date":       p.Date,
			}, &dc); err == nil {

				// Sum seats booked for the date (consider seats per booking)
				var dateBookings []models.Booking
				if err := app.DB.FindMany(ctx, bookingsCollection, bson.M{
					"entityType": p.EntityType,
					"entityId":   p.EntityId,
					"date":       p.Date,
					"status":     bson.M{"$ne": "cancelled"},
				}, &dateBookings); err != nil {
					http.Error(w, "db error", http.StatusInternalServerError)
					return
				}

				dateTotalSeats := 0
				for _, dbb := range dateBookings {
					dateTotalSeats += dbb.Seats
				}

				if dateTotalSeats >= dc.Capacity {
					_ = json.NewEncoder(w).Encode(map[string]any{
						"ok":     false,
						"reason": "date-full",
					})
					return
				}
			}
		}

		p.ID = genID()
		p.Status = "pending"
		p.CreatedAt = time.Now().Unix()

		if err := app.DB.InsertOne(ctx, bookingsCollection, p); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":      true,
			"booking": p,
		})
	}
}

// ---------- Booking status ----------

func UpdateBookingStatus(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		bookingID := ps.ByName("id")
		if bookingID == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		var body struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		if body.Status != "pending" && body.Status != "confirmed" && body.Status != "cancelled" {
			http.Error(w, "invalid status", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var updated models.Booking
		err := app.DB.FindOneAndUpdate(
			ctx,
			bookingsCollection,
			bson.M{"id": bookingID},
			bson.M{"$set": bson.M{"status": body.Status}},
			&updated,
		)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":      true,
			"booking": updated,
		})
	}
}

func CancelBooking(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		bookingID := ps.ByName("id")
		if bookingID == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var updated models.Booking
		err := app.DB.FindOneAndUpdate(
			ctx,
			bookingsCollection,
			bson.M{"id": bookingID},
			bson.M{"$set": bson.M{"status": "cancelled"}},
			&updated,
		)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":      true,
			"booking": updated,
		})
	}
}

// ---------- Date capacity ----------

// ---------- Date capacity ----------

func SetDateCapacity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		var p models.DateCap
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		if p.EntityType == "" || p.EntityId == "" || p.Date == "" || p.Capacity <= 0 {
			http.Error(w, "missing fields", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := app.DB.UpdateOne(
			ctx,
			dateCapsCollection,
			bson.M{
				"entityType": p.EntityType,
				"entityId":   p.EntityId,
				"date":       p.Date,
			},
			bson.M{"$set": p},
		)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true,
		})
	}
}
