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
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
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
