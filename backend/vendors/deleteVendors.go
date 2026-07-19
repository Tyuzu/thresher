package vendors

import (
	"context"
	"errors"
	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
)

// DeleteVendorHandler soft-deletes a vendor profile.
func DeleteVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		vendorID := strings.TrimSpace(ps.ByName("vendorID"))
		if vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID is required")
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

		if err := DeleteVendor(ctx, app, vendorID); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "DELETE_FAILED", "Failed to delete vendor")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.VendorDeletedEvent, mqevent.VendorDeletedPayload{})
		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Vendor deleted",
		})
	}
}

// RemoveVendorHandler removes a vendor from an event.
func RemoveVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		eventID := strings.TrimSpace(ps.ByName("eventID"))
		vendorID := strings.TrimSpace(ps.ByName("vendorID"))
		if eventID == "" || vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Event ID and Vendor ID are required")
			return
		}

		existing, err := GetVendorHiringByEventAndVendor(ctx, app, eventID, vendorID)
		if err != nil || existing == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found for this event")
			return
		}

		if existing.HiredBy != userID {
			writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Unauthorized")
			return
		}

		if err := RemoveVendorFromEvent(ctx, app, eventID, vendorID); err != nil {
			if errors.Is(err, ErrVendorNotInEvent) {
				writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found for this event")
				return
			}

			writeJSONError(w, http.StatusInternalServerError, "REMOVE_FAILED", "Failed to remove vendor")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.VendorDeletedEvent, mqevent.VendorDeletedPayload{})
		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Vendor removed successfully",
		})
	}
}
