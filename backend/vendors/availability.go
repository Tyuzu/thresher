package vendors

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func ListAvailabilityHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		vendorID := ps.ByName("vendorID")
		if vendorID == "" {
			http.Error(w, "vendorID required", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		filter := bson.M{"vendorid": vendorID}
		var slots []models.AvailabilitySlot
		if err := app.DB.FindMany(ctx, config.Collections.VendorAvailabilityCollection, filter, &slots); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"slots": slots})
	}
}

// Create availability slot (vendor sets unavailable dates or recurring availability)
func CreateAvailabilityHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		userID, _ := r.Context().Value(config.UserIDKey).(string)

		vendorID := ps.ByName("vendorID")
		if vendorID == "" {
			http.Error(w, "vendorID required", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var slot models.AvailabilitySlot
		if err := json.NewDecoder(r.Body).Decode(&slot); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		// Basic validation
		slot.VendorID = vendorID
		if slot.StartDate == "" || slot.EndDate == "" {
			http.Error(w, "start_date and end_date required", http.StatusBadRequest)
			return
		}

		// Verify caller owns the vendor profile
		var vendor models.Vendor
		if err := app.DB.FindOne(ctx, config.Collections.VendorCollection, bson.M{"vendorid": vendorID}, &vendor); err != nil {
			http.Error(w, "vendor not found", http.StatusNotFound)
			return
		}
		if userID == "" || vendor.UserID != userID {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		var existing []models.AvailabilitySlot
		_ = app.DB.FindMany(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"vendorid": vendorID}, &existing)
		// simple in-app overlap check
		for _, ex := range existing {
			if !(ex.EndDate < slot.StartDate || ex.StartDate > slot.EndDate) {
				http.Error(w, "overlap", http.StatusConflict)
				return
			}
		}

		slot.SlotID = genSlotID()
		slot.CreatedAt = time.Now().UTC()

		if err := app.DB.InsertOne(ctx, config.Collections.VendorAvailabilityCollection, slot); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"ok": true, "slot": slot})
	}
}

// Delete availability slot
func DeleteAvailabilityHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		userID, _ := r.Context().Value(config.UserIDKey).(string)

		vendorID := ps.ByName("vendorID")
		slotID := ps.ByName("slotID")
		if vendorID == "" || slotID == "" {
			http.Error(w, "missing params", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var slot models.AvailabilitySlot
		if err := app.DB.FindOne(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"slotid": slotID, "vendorid": vendorID}, &slot); err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		// verify ownership
		var vendor models.Vendor
		if err := app.DB.FindOne(ctx, config.Collections.VendorCollection, bson.M{"vendorid": vendorID}, &vendor); err != nil {
			http.Error(w, "vendor not found", http.StatusNotFound)
			return
		}
		if userID == "" || vendor.UserID != userID {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		if _, err := app.DB.DeleteOne(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"slotid": slotID}); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

// helper to generate simple slot id
func genSlotID() string {
	return time.Now().UTC().Format("20060102T150405")
}
