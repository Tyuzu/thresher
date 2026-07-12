package vendors

import (
	"context"
	"encoding/json"
	"errors"
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

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func writeJSONError(w http.ResponseWriter, status int, code string, message string) {
	utils.RespondWithJSON(w, status, map[string]any{
		"success": false,
		"error":   code,
		"message": message,
	})
}

// RegisterVendorHandler handles vendor registration.
func RegisterVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		var req struct {
			Name        string `json:"name"`
			Category    string `json:"category"`
			Description string `json:"description"`
			Phone       string `json:"phone"`
			Email       string `json:"email"`
			Location    string `json:"location"`
		}

		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		req.Category = strings.TrimSpace(req.Category)
		req.Description = strings.TrimSpace(req.Description)
		req.Email = strings.TrimSpace(req.Email)
		req.Phone = strings.TrimSpace(req.Phone)
		req.Location = strings.TrimSpace(req.Location)

		if req.Name == "" || req.Category == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and category are required")
			return
		}

		vendor, err := RegisterVendor(
			ctx,
			app,
			userID,
			req.Name,
			req.Category,
			req.Description,
			req.Email,
			req.Phone,
			req.Location,
		)
		if err != nil {
			if errors.Is(err, ErrVendorAlreadyExists) {
				writeJSONError(w, http.StatusConflict, "VENDOR_EXISTS", "Vendor profile already exists")
				return
			}

			writeJSONError(w, http.StatusInternalServerError, "REGISTER_FAILED", "Failed to register vendor")
			return
		}
		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.VendorRegisteredEvent, mqevent.VendorRegisteredPayload{}); err != nil {
			log.Printf("failed to publish vendor registered event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"success": true,
			"vendor":  vendor,
		})
	}
}

// GetVendorsHandler retrieves all available vendors.
func GetVendorsHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		search := strings.TrimSpace(r.URL.Query().Get("search"))
		category := strings.TrimSpace(r.URL.Query().Get("category"))

		vendors, err := GetAllVendors(ctx, app, search, category)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "LOAD_FAILED", "Failed to get vendors")
			return
		}

		if vendors == nil {
			vendors = []models.Vendor{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"vendors": vendors,
		})
	}
}

// GetVendorHandler retrieves a single vendor by ID.
func GetVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		vendorID := strings.TrimSpace(ps.ByName("vendorID"))
		if vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID is required")
			return
		}

		vendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"vendor":  vendor,
		})
	}
}

// GetMyVendorHandler retrieves the current user's active vendor profile.
func GetMyVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		vendor, err := GetVendorByUserID(ctx, app, userID)
		if err != nil || vendor == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor profile not found")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"vendor":  vendor,
		})
	}
}

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

// HireVendorHandler handles hiring a vendor for an event.
func HireVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		eventID := strings.TrimSpace(ps.ByName("eventID"))
		if eventID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Event ID is required")
			return
		}

		var req struct {
			VendorID     string `json:"vendorid"`
			VendorIDAlt  string `json:"vendorId"`
			VendorIDAlt2 string `json:"vendorID"`
		}

		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		vendorID := strings.TrimSpace(req.VendorID)
		if vendorID == "" {
			vendorID = strings.TrimSpace(req.VendorIDAlt)
		}
		if vendorID == "" {
			vendorID = strings.TrimSpace(req.VendorIDAlt2)
		}
		if vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID is required")
			return
		}

		vendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil || vendor == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found")
			return
		}

		hiring, err := HireVendor(ctx, app, eventID, vendorID, vendor.Name, vendor.Category, userID)
		if err != nil {
			if errors.Is(err, ErrVendorAlreadyHired) {
				writeJSONError(w, http.StatusConflict, "ALREADY_HIRED", "Vendor already hired for this event")
				return
			}

			writeJSONError(w, http.StatusInternalServerError, "HIRE_FAILED", "Failed to hire vendor")
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.VendorHiredEvent, mqevent.VendorHiredPayload{}); err != nil {
			log.Printf("failed to publish vendor hired event: %v", err)
		}
		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"success": true,
			"hiring":  hiring,
		})
	}
}

// GetEventVendorsHandler retrieves all vendors hired for an event.
func GetEventVendorsHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		eventID := strings.TrimSpace(ps.ByName("eventID"))
		if eventID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Event ID is required")
			return
		}

		vendorResponses, err := GetVendorsByEvent(ctx, app, eventID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "LOAD_FAILED", "Failed to get vendors")
			return
		}

		if vendorResponses == nil {
			vendorResponses = []models.VendorResponse{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"vendors": vendorResponses,
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

// GetMyVendorRequestsHandler retrieves hiring requests for the current vendor.
func GetMyVendorRequestsHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		vendor, err := GetVendorByUserID(ctx, app, userID)
		if err != nil || vendor == nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor profile not found")
			return
		}

		hirings, err := GetVendorHiringsByVendorID(ctx, app, vendor.VendorID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "LOAD_FAILED", "Failed to load vendor requests")
			return
		}

		if hirings == nil {
			hirings = []models.VendorHiring{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success":  true,
			"requests": hirings,
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
