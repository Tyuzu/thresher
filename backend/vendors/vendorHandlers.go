package vendors

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"naevis/globals"
	"naevis/infra"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeJSONError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, map[string]any{
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

		userID, ok := r.Context().Value(globals.UserIDKey).(string)
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
		if err := decoder.Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Category) == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and category are required")
			return
		}

		vendor, err := RegisterVendor(
			ctx,
			app,
			userID,
			strings.TrimSpace(req.Name),
			strings.TrimSpace(req.Category),
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

		writeJSON(w, http.StatusCreated, map[string]any{
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

		category := strings.TrimSpace(r.URL.Query().Get("category"))

		var (
			vendors []models.Vendor
			err     error
		)

		if category != "" {
			vendors, err = GetVendorsByCategory(ctx, app, category)
		} else {
			vendors, err = GetAllVendors(ctx, app)
		}

		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "LOAD_FAILED", "Failed to get vendors")
			return
		}

		if vendors == nil {
			vendors = []models.Vendor{}
		}

		writeJSON(w, http.StatusOK, map[string]any{
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

		writeJSON(w, http.StatusOK, map[string]any{
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

		userID, ok := r.Context().Value(globals.UserIDKey).(string)
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
		if err != nil {
			writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found")
			return
		}

		if vendor.UserID != userID {
			writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Unauthorized")
			return
		}

		var updates map[string]any
		decoder := json.NewDecoder(r.Body)
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
			"available":    {},
			"verified":     {},
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

		if err := UpdateVendor(ctx, app, vendorID, updateDoc); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update vendor")
			return
		}

		updatedVendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "LOAD_FAILED", "Failed to load updated vendor")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"vendor":  updatedVendor,
		})
	}
}

// HireVendorHandler handles hiring a vendor for an event.
func HireVendorHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, ok := r.Context().Value(globals.UserIDKey).(string)
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
			VendorID    string `json:"vendorid"`
			VendorIDAlt string `json:"vendorId"`
		}

		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
			return
		}

		vendorID := strings.TrimSpace(req.VendorID)
		if vendorID == "" {
			vendorID = strings.TrimSpace(req.VendorIDAlt)
		}
		if vendorID == "" {
			writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vendor ID is required")
			return
		}

		vendor, err := GetVendorByID(ctx, app, vendorID)
		if err != nil {
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

		writeJSON(w, http.StatusCreated, map[string]any{
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

		writeJSON(w, http.StatusOK, map[string]any{
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

		userID, ok := r.Context().Value(globals.UserIDKey).(string)
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

		_ = userID

		if err := RemoveVendorFromEvent(ctx, app, eventID, vendorID); err != nil {
			if errors.Is(err, ErrVendorNotFound) {
				writeJSONError(w, http.StatusNotFound, "VENDOR_NOT_FOUND", "Vendor not found for this event")
				return
			}

			writeJSONError(w, http.StatusInternalServerError, "REMOVE_FAILED", "Failed to remove vendor")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Vendor removed successfully",
		})
	}
}
