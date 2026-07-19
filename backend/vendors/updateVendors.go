package vendors

import (
	"context"
	"encoding/json"
	"log"
	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// UpdateVendorHandler updates vendor information.
func UpdateVendorHandler(app *infra.Deps) httprouter.Handle {
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

		var updates map[string]any
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&updates); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		updateDoc := bson.M{}
		allowedFields := map[string]struct{}{
			"name":         {},
			"category":     {},
			"description":  {},
			"phone":        {},
			"email":        {},
			"location":     {},
			"profileimage": {},
			"portfolio":    {},
		}

		for k, v := range updates {
			key := strings.ToLower(strings.TrimSpace(k))
			if _, ok := allowedFields[key]; ok {
				updateDoc[key] = v
			}
		}

		if len(updateDoc) == 0 {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "No valid update fields provided")
			return
		}

		if name, ok := updateDoc["name"].(string); ok {
			updateDoc["name"] = strings.TrimSpace(name)
		}
		if category, ok := updateDoc["category"].(string); ok {
			updateDoc["category"] = strings.TrimSpace(category)
		}
		if description, ok := updateDoc["description"].(string); ok {
			updateDoc["description"] = strings.TrimSpace(description)
		}
		if phone, ok := updateDoc["phone"].(string); ok {
			updateDoc["phone"] = strings.TrimSpace(phone)
		}
		if email, ok := updateDoc["email"].(string); ok {
			updateDoc["email"] = strings.TrimSpace(email)
		}
		if location, ok := updateDoc["location"].(string); ok {
			updateDoc["location"] = strings.TrimSpace(location)
		}
		if profileImage, ok := updateDoc["profileimage"].(string); ok {
			updateDoc["profileimage"] = strings.TrimSpace(profileImage)
		}
		if portfolio, ok := updateDoc["portfolio"].(string); ok {
			updateDoc["portfolio"] = strings.TrimSpace(portfolio)
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
func UpdateVendorStatusHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		hiringID := strings.TrimSpace(ps.ByName("hiringID"))
		if hiringID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Hiring ID is required")
			return
		}

		var req struct {
			Status string `json:"status"`
		}

		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		status := strings.TrimSpace(strings.ToLower(req.Status))
		switch status {
		case "hired", "pending", "completed", "cancelled", "accepted", "rejected":
		default:
			writeJSONError(w, http.StatusBadRequest, "INVALID_STATUS", "Invalid status")
			return
		}

		hiring, err := GetVendorHiringByID(ctx, app, hiringID)
		if err != nil || hiring == nil {
			writeJSONError(w, http.StatusNotFound, "HIRING_NOT_FOUND", "Hiring record not found")
			return
		}

		vendorOwnerID := ""
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
