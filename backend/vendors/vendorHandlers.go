package vendors

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
)

// RegisterVendorHandler handles vendor registration.
func RegisterVendorHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		if err := decodeJSON(r, &req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		name := strings.TrimSpace(req.Name)
		category := strings.TrimSpace(req.Category)
		if name == "" || category == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and category are required")
			return
		}

		vendor, err := RegisterVendor(
			ctx,
			app,
			userID,
			name,
			category,
			strings.TrimSpace(req.Description),
			strings.TrimSpace(req.Email),
			strings.TrimSpace(req.Phone),
			strings.TrimSpace(req.Location),
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

// HireVendorHandler handles hiring a vendor for an event.
func HireVendorHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		eventID := strings.TrimSpace(utils.GetParam(r, "eventID"))
		if eventID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Event ID is required")
			return
		}

		var req struct {
			VendorID     string `json:"vendorid"`
			VendorIDAlt  string `json:"vendorId"`
			VendorIDAlt2 string `json:"vendorID"`
		}

		if err := decodeJSON(r, &req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		vendorID := firstNonEmpty(req.VendorID, req.VendorIDAlt, req.VendorIDAlt2)
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

func firstNonEmpty(items ...string) string {
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
