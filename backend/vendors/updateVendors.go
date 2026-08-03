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
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

var allowedUpdateFields = map[string]struct{}{
	"name":         {},
	"category":     {},
	"description":  {},
	"phone":        {},
	"email":        {},
	"location":     {},
	"profileimage": {},
	"portfolio":    {},
}

// UpdateVendorHandler updates vendor information.
func UpdateVendorHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

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

		vendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil || vendor == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found")
			return
		}

		if vendor.UserID != userID {
			writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Unauthorized")
			return
		}

		var rawUpdates map[string]any
		if err := decodeJSON(r, &rawUpdates); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		updateDoc := bson.M{}
		for k, v := range rawUpdates {
			key := strings.ToLower(strings.TrimSpace(k))
			if _, allowed := allowedUpdateFields[key]; allowed {
				if strVal, ok := v.(string); ok {
					updateDoc[key] = strings.TrimSpace(strVal)
				} else {
					updateDoc[key] = v
				}
			}
		}

		if len(updateDoc) == 0 {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "No valid update fields provided")
			return
		}

		if err := UpdateVendor(ctx, app, vendorID, updateDoc); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update vendor")
			return
		}

		updatedVendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil || updatedVendor == nil {
			writeJSONError(w, http.StatusInternalServerError, "LOAD_FAILED", "Failed to load updated vendor")
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.VendorUpdatedEvent, mqevent.VendorUpdatedPayload{}); err != nil {
			log.Printf("failed to publish vendor updated event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"vendor":  updatedVendor,
		})
	}
}

// UpdateVendorStatusHandler updates the status of a vendor hiring record.
func UpdateVendorStatusHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		hiringID := strings.TrimSpace(utils.GetParam(r, "hiringID"))
		if hiringID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Hiring ID is required")
			return
		}

		var req struct {
			Status string `json:"status"`
		}
		if err := decodeJSON(r, &req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		status := strings.ToLower(strings.TrimSpace(req.Status))
		switch status {
		case "hired", "pending", "completed", "cancelled", "accepted", "rejected":
		default:
			writeJSONError(w, http.StatusBadRequest, "INVALID_STATUS", "Invalid status value")
			return
		}

		hiring, err := GetVendorHiringByID(ctx, app, hiringID)
		if err != nil || hiring == nil {
			writeJSONError(w, http.StatusNotFound, "HIRING_NOT_FOUND", "Hiring record not found")
			return
		}

		var vendorOwnerID string
		if vendor, err := GetVendorByID(ctx, app, hiring.VendorID); err == nil && vendor != nil {
			vendorOwnerID = vendor.UserID
		}

		canUpdateAsRequester := hiring.HiredBy == userID
		canUpdateAsVendor := vendorOwnerID != "" && vendorOwnerID == userID

		switch status {
		case "accepted", "rejected":
			if !canUpdateAsVendor {
				writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Only the vendor can accept or reject this request")
				return
			}
		case "cancelled", "completed", "pending", "hired":
			if !canUpdateAsRequester {
				writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Only the event organizer can update this status")
				return
			}
		}

		if err := UpdateVendorStatus(ctx, app, hiringID, status); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update status")
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.VendorStatusUpdatedEvent, mqevent.VendorStatusUpdatedPayload{}); err != nil {
			log.Printf("failed to publish vendor status updated event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"status":  status,
		})
	}
}
