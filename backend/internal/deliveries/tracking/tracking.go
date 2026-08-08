package tracking

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/internal/deliveries"
	"naevis/utils"
)

func GetDeliveryTracking(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var result bson.M
		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
		proj := []string{"status", "status_history", "current_location"}

		if err := app.DB.FindOneWithProjection(ctx, "deliveries", filter, proj, &result); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Tracking details not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, result)
	}
}

func GetDeliveryLocation(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		ctx := r.Context()

		locationBytes, err := app.Cache.Get(ctx, fmt.Sprintf("location:delivery:%s", deliveryID))
		if err == nil && len(locationBytes) > 0 {
			var loc deliveries.GPSData
			_ = json.Unmarshal(locationBytes, &loc)
			utils.RespondWithJSON(w, http.StatusOK, loc)
			return
		}

		utils.RespondWithError(w, http.StatusNotFound, "Location not available")
	}
}

func GetDeliveryEvents(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var events []bson.M
		filter := bson.M{"delivery_id": deliveryID, "tenant_id": tenantID}
		if err := app.DB.FindMany(ctx, "delivery_events", filter, &events); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve events")
			return
		}

		if len(events) == 0 {
			events = []bson.M{}
		}
		utils.RespondWithJSON(w, http.StatusOK, events)
	}
}

func GetStatusHistory(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var res struct {
			StatusHistory []deliveries.StatusHistoryItem `bson:"status_history" json:"status_history"`
		}
		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
		if err := app.DB.FindOneWithProjection(ctx, "deliveries", filter, []string{"status_history"}, &res); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "History not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, res.StatusHistory)
	}
}

func AddProof(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())

		var req struct {
			ProofType string `json:"type"`
			URL       string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid body")
			return
		}

		ctx := r.Context()
		proof := deliveries.Proof{
			ProofID:   utils.GenerateRandomString(16),
			Type:      req.ProofType,
			URL:       req.URL,
			CreatedAt: time.Now(),
		}

		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
		if err := app.DB.AddToSet(ctx, "deliveries", filter, "proofs", proof); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to add proof")
			return
		}
		utils.RespondWithJSON(w, http.StatusCreated, proof)
	}
}

func GetProof(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var res struct {
			Proofs []deliveries.Proof `bson:"proofs" json:"proofs"`
		}
		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
		if err := app.DB.FindOneWithProjection(ctx, "deliveries", filter, []string{"proofs"}, &res); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Proof not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, res.Proofs)
	}
}

func GetPublicTracking(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := utils.GetParam(r, "token")
		ctx := r.Context()

		var res bson.M
		filter := bson.M{"public_tracking_token": token}
		proj := []string{"status", "pickup_loc", "dropoff_loc", "estimated_arrival"}

		if err := app.DB.FindOneWithProjection(ctx, "deliveries", filter, proj, &res); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Invalid or expired tracking token")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, res)
	}
}

func GetPublicLocation(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := utils.GetParam(r, "token")
		ctx := r.Context()

		deliveryIDBytes, err := app.Cache.Get(ctx, fmt.Sprintf("token:map:%s", token))
		if err != nil || len(deliveryIDBytes) == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "Tracking token location unavailable")
			return
		}

		locBytes, err := app.Cache.Get(ctx, fmt.Sprintf("location:delivery:%s", string(deliveryIDBytes)))
		if err != nil || len(locBytes) == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "Live location not streaming")
			return
		}

		var loc deliveries.GPSData
		_ = json.Unmarshal(locBytes, &loc)
		utils.RespondWithJSON(w, http.StatusOK, loc)
	}
}
