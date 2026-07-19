package vendors

import (
	"context"
	"naevis/config"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
)

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
