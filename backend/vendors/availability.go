package vendors

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// ListAvailabilityHandler retrieves availability slots for a specific vendor.
func ListAvailabilityHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vendorID := strings.TrimSpace(utils.GetParam(r, "vendorID"))
		if vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID is required")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		slots := make([]models.AvailabilitySlot, 0)
		filter := bson.M{"vendorid": vendorID}

		if err := app.DB.FindMany(ctx, config.Collections.VendorAvailabilityCollection, filter, &slots); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to fetch availability slots")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"slots":   slots,
		})
	}
}

// CreateAvailabilityHandler handles creating unavailable dates or recurring availability slots.
func CreateAvailabilityHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		vendorID := strings.TrimSpace(utils.GetParam(r, "vendorID"))
		if vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID is required")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var slot models.AvailabilitySlot
		if err := decodeJSON(r, &slot); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		slot.StartDate = strings.TrimSpace(slot.StartDate)
		slot.EndDate = strings.TrimSpace(slot.EndDate)
		if slot.StartDate == "" || slot.EndDate == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Start date and end date are required")
			return
		}

		vendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil || vendor == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found")
			return
		}

		if vendor.UserID != userID {
			writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Unauthorized")
			return
		}

		var existing []models.AvailabilitySlot
		_ = app.DB.FindMany(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"vendorid": vendorID}, &existing)

		for _, ex := range existing {
			if !(ex.EndDate < slot.StartDate || ex.StartDate > slot.EndDate) {
				writeJSONError(w, http.StatusConflict, "SLOT_OVERLAP", "Availability slot overlaps with existing slot")
				return
			}
		}

		slot.VendorID = vendorID
		slot.SlotID = genSlotID()
		slot.CreatedAt = time.Now().UTC()

		if err := app.DB.InsertOne(ctx, config.Collections.VendorAvailabilityCollection, slot); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to save availability slot")
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.SlotCreatedEvent, mqevent.SlotCreatedPayload{}); err != nil {
			log.Printf("failed to publish slot created event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"success": true,
			"slot":    slot,
		})
	}
}

// DeleteAvailabilityHandler removes an availability slot.
func DeleteAvailabilityHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		vendorID := strings.TrimSpace(utils.GetParam(r, "vendorID"))
		slotID := strings.TrimSpace(utils.GetParam(r, "slotID"))
		if vendorID == "" || slotID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID and Slot ID are required")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var slot models.AvailabilitySlot
		if err := app.DB.FindOne(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"slotid": slotID, "vendorid": vendorID}, &slot); err != nil {
			writeJSONError(w, http.StatusNotFound, "SLOT_NOT_FOUND", "Availability slot not found")
			return
		}

		vendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil || vendor == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found")
			return
		}

		if vendor.UserID != userID {
			writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Unauthorized")
			return
		}

		if _, err := app.DB.DeleteOne(ctx, config.Collections.VendorAvailabilityCollection, bson.M{"slotid": slotID}); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to delete availability slot")
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.SlotDeletedEvent, mqevent.SlotDeletedPayload{}); err != nil {
			log.Printf("failed to publish slot deleted event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Availability slot deleted successfully",
		})
	}
}

func genSlotID() string {
	return time.Now().UTC().Format("20060102T150405")
}
