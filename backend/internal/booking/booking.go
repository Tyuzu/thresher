package booking

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/internal/vendors"
	"naevis/utils"
)

// Define domain-specific constants for statuses and entity types
const (
	StatusPending   = "pending"
	StatusConfirmed = "confirmed"
	StatusCancelled = "cancelled"

	EntityTypeVendor = "vendor"
)

// Response helpers for consistent JSON output
type apiResponse struct {
	OK      bool   `json:"ok"`
	Reason  string `json:"reason,omitempty"`
	Booking any    `json:"booking,omitempty"`
}

func respondError(w http.ResponseWriter, code int, message string) {
	http.Error(w, message, code)
}

func respondJSON(w http.ResponseWriter, code int, ok bool, reason string, booking any) {
	utils.RespondWithJSON(w, code, apiResponse{
		OK:      ok,
		Reason:  reason,
		Booking: booking,
	})
}

// ---------- Handlers ----------

func CreateBooking(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Use request context to allow downstream cancellations/timeouts from HTTP middleware
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var req Booking
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		if err := validateBookingRequest(&req); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		// 1. Vendor availability check
		if req.EntityType == EntityTypeVendor {
			var unavailable []vendors.AvailabilitySlot
			if err := FindVendorAvailability(ctx, app.DB, req.EntityId, req.Date, &unavailable); err != nil {
				respondError(w, http.StatusInternalServerError, "db error")
				return
			}
			if len(unavailable) > 0 {
				respondJSON(w, http.StatusOK, false, "vendor-unavailable", nil)
				return
			}
		}

		// 2. One booking per user per date restriction
		count, err := CountBookings(ctx, app.DB, bson.M{
			"entityType": req.EntityType,
			"entityId":   req.EntityId,
			"userId":     req.UserId,
			"date":       req.Date,
			"status":     bson.M{"$ne": StatusCancelled},
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "db error")
			return
		}
		if count > 0 {
			respondJSON(w, http.StatusOK, false, "one-per-day", nil)
			return
		}

		// 3. Capacity validation (Slot > Tier > Date)
		reason, err := validateCapacity(ctx, app, &req)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "db error")
			return
		}
		if reason != "" {
			respondJSON(w, http.StatusOK, false, reason, nil)
			return
		}

		// 4. Persistence & Event Dispatch
		req.ID = genID()
		req.Status = StatusPending
		req.CreatedAt = time.Now().Unix()

		if err := InsertBooking(ctx, app.DB, req); err != nil {
			respondError(w, http.StatusInternalServerError, "db error")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BookingCreatedEvent, mqevent.BookingCreatedPayload{})

		respondJSON(w, http.StatusOK, true, "", req)
	}
}

func UpdateBookingStatus(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bookingID := utils.GetParam(r, "id")
		if bookingID == "" {
			respondError(w, http.StatusBadRequest, "missing id")
			return
		}

		var body struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			respondError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		switch body.Status {
		case StatusPending, StatusConfirmed, StatusCancelled:
			// valid status
		default:
			respondError(w, http.StatusBadRequest, "invalid status")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var updated Booking
		err := UpdateBookingStatusByID(
			ctx,
			app.DB,
			bookingID,
			bson.M{"$set": bson.M{"status": body.Status}},
			&updated,
		)
		if err != nil {
			respondError(w, http.StatusNotFound, "not found")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BookingUpdatedEvent, mqevent.BookingUpdatedPayload{})

		respondJSON(w, http.StatusOK, true, "", updated)
	}
}

func CancelBooking(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bookingID := utils.GetParam(r, "id")
		if bookingID == "" {
			respondError(w, http.StatusBadRequest, "missing id")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var updated Booking
		err := UpdateBookingStatusByID(
			ctx,
			app.DB,
			bookingID,
			bson.M{"$set": bson.M{"status": StatusCancelled}},
			&updated,
		)
		if err != nil {
			respondError(w, http.StatusNotFound, "not found")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BookingCancelledEvent, mqevent.BookingCancelledPayload{})

		respondJSON(w, http.StatusOK, true, "", updated)
	}
}

func SetDateCapacity(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req DateCap
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		if req.EntityType == "" || req.EntityId == "" || req.Date == "" || req.Capacity <= 0 {
			respondError(w, http.StatusBadRequest, "missing fields")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		_, err := UpdateDateCapacity(
			ctx,
			app.DB,
			req.EntityType,
			req.EntityId,
			req.Date,
			bson.M{"$set": req},
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "db error")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.DateCapacitySetEvent, mqevent.DateCapacitySetPayload{})

		respondJSON(w, http.StatusOK, true, "", nil)
	}
}

// ---------- Helper Functions ----------

func validateBookingRequest(b *Booking) error {
	if b.UserId == "" || b.EntityType == "" || b.EntityId == "" || b.Date == "" || b.Start == "" {
		return errors.New("missing fields")
	}
	return nil
}

// validateCapacity handles the priority check: Slot > Tier > DateCap.
// Returns a failure reason string (if capacity is full/missing) or an error.
func validateCapacity(ctx context.Context, app *infra.Deps, req *Booking) (string, error) {
	switch {
	case req.SlotId != "":
		var slot Slot
		if err := FindSlotByID(ctx, app.DB, req.SlotId, &slot); err != nil {
			return "slot-missing", nil
		}

		var slotBookings []Booking
		err := FindBookings(ctx, app.DB, bson.M{
			"entityType": req.EntityType,
			"entityId":   req.EntityId,
			"slotId":     req.SlotId,
			"status":     bson.M{"$ne": StatusCancelled},
		}, &slotBookings)
		if err != nil {
			return "", err
		}

		if sumSeats(slotBookings) >= slot.Capacity {
			return "slot-full", nil
		}

		if slot.TierId != "" {
			req.TierId = slot.TierId
			req.TierName = slot.TierName
		}

	case req.TierId != "":
		var tier Tier
		if err := FindTierByID(ctx, app.DB, req.TierId, &tier); err != nil {
			return "tier-missing", nil
		}

		var tierBookings []Booking
		err := FindBookings(ctx, app.DB, bson.M{
			"entityType": req.EntityType,
			"entityId":   req.EntityId,
			"tierId":     req.TierId,
			"date":       req.Date,
			"status":     bson.M{"$ne": StatusCancelled},
		}, &tierBookings)
		if err != nil {
			return "", err
		}

		if sumSeats(tierBookings) >= tier.Capacity {
			return "tier-full", nil
		}

		req.TierName = tier.Name
		if req.PricePaid == 0 {
			req.PricePaid = tier.Price
		}

	default:
		var dc DateCap
		if err := FindDateCap(ctx, app.DB, req.EntityType, req.EntityId, req.Date, &dc); err == nil {
			var dateBookings []Booking
			err := app.DB.FindMany(ctx, bookingsCollection, bson.M{
				"entityType": req.EntityType,
				"entityId":   req.EntityId,
				"date":       req.Date,
				"status":     bson.M{"$ne": StatusCancelled},
			}, &dateBookings)
			if err != nil {
				return "", err
			}

			if sumSeats(dateBookings) >= dc.Capacity {
				return "date-full", nil
			}
		}
	}

	return "", nil
}

func sumSeats(bookings []Booking) int {
	total := 0
	for _, b := range bookings {
		total += b.Seats
	}
	return total
}
