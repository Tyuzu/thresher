package deliveries

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"naevis/infra"
)

type GPSData struct {
	Lat       float64   `json:"lat" bson:"lat"`
	Lng       float64   `json:"lng" bson:"lng"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
}

func GetDeliveryTracking(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		var result bson.M
		objID, _ := primitive.ObjectIDFromHex(deliveryID)
		if err := app.DB.FindOneWithProjection(ctx, "deliveries", bson.M{"_id": objID}, []string{"status", "status_history", "current_location"}, &result); err != nil {
			respondError(w, http.StatusNotFound, "Tracking details not found")
			return
		}
		respondJSON(w, http.StatusOK, result)
	}
}

func GetDeliveryLocation(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		// Read fast-path from Redis Hash or KV
		locationBytes, err := app.Cache.Get(ctx, fmt.Sprintf("location:delivery:%s", deliveryID))
		if err == nil && len(locationBytes) > 0 {
			var loc GPSData
			_ = json.Unmarshal(locationBytes, &loc)
			respondJSON(w, http.StatusOK, loc)
			return
		}

		respondError(w, http.StatusNotFound, "Location not available")
	}
}

func GetDeliveryEvents(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		var events []bson.M
		if err := app.DB.FindMany(ctx, "delivery_events", bson.M{"delivery_id": deliveryID}, &events); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to retrieve events")
			return
		}
		respondJSON(w, http.StatusOK, events)
	}
}

func GetStatusHistory(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		var res struct {
			StatusHistory []bson.M `bson:"status_history" json:"status_history"`
		}
		objID, _ := primitive.ObjectIDFromHex(deliveryID)
		if err := app.DB.FindOneWithProjection(ctx, "deliveries", bson.M{"_id": objID}, []string{"status_history"}, &res); err != nil {
			respondError(w, http.StatusNotFound, "History not found")
			return
		}
		respondJSON(w, http.StatusOK, res.StatusHistory)
	}
}

func AddProof(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		var req struct {
			ProofType string `json:"type"` // e.g. "PHOTO", "SIGNATURE"
			URL       string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid body")
			return
		}

		ctx := r.Context()
		objID, _ := primitive.ObjectIDFromHex(deliveryID)
		proof := bson.M{
			"type":       req.ProofType,
			"url":        req.URL,
			"created_at": time.Now(),
		}

		if err := app.DB.AddToSet(ctx, "deliveries", bson.M{"_id": objID}, "proofs", proof); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to add proof")
			return
		}
		respondJSON(w, http.StatusCreated, map[string]string{"status": "proof_added"})
	}
}

func GetProof(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		var res struct {
			Proofs []bson.M `bson:"proofs" json:"proofs"`
		}
		objID, _ := primitive.ObjectIDFromHex(deliveryID)
		if err := app.DB.FindOneWithProjection(ctx, "deliveries", bson.M{"_id": objID}, []string{"proofs"}, &res); err != nil {
			respondError(w, http.StatusNotFound, "Proof not found")
			return
		}
		respondJSON(w, http.StatusOK, res.Proofs)
	}
}
