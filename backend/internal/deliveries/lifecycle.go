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

func updateDeliveryStatus(app *infra.Deps, r *http.Request, deliveryID string, newStatus string) (*Delivery, error) {
	ctx := r.Context()
	objID, err := primitive.ObjectIDFromHex(deliveryID)
	if err != nil {
		return nil, err
	}

	filter := bson.M{"_id": objID}
	update := bson.M{
		"$set": bson.M{
			"status":     newStatus,
			"updated_at": time.Now(),
		},
		"$push": bson.M{
			"status_history": bson.M{
				"status":     newStatus,
				"timestamp":  time.Now(),
				"updated_by": r.Header.Get("X-User-ID"),
			},
		},
	}

	var updatedDelivery Delivery
	err = app.DB.FindOneAndUpdate(ctx, "deliveries", filter, update, &updatedDelivery)
	if err != nil {
		return nil, err
	}

	// Invalidate Cache
	_ = app.Cache.Del(ctx, fmt.Sprintf("delivery:%s", deliveryID))

	// Notify NATS
	_ = app.NatsConn.Publish(fmt.Sprintf("deliveries.status.%s", newStatus), []byte(deliveryID))

	return &updatedDelivery, nil
}

func AssignDriver(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		var req struct {
			DriverID string `json:"driver_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		ctx := r.Context()
		objID, _ := primitive.ObjectIDFromHex(deliveryID)
		filter := bson.M{"_id": objID}
		update := bson.M{
			"$set": bson.M{
				"driver_id":  req.DriverID,
				"status":     "ASSIGNED",
				"updated_at": time.Now(),
			},
		}

		var updated Delivery
		if err := app.DB.FindOneAndUpdate(ctx, "deliveries", filter, update, &updated); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to assign driver")
			return
		}

		_ = app.Cache.Del(ctx, fmt.Sprintf("delivery:%s", deliveryID))
		respondJSON(w, http.StatusOK, updated)
	}
}

func AcceptAssignment(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, "ACCEPTED")
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to accept assignment")
			return
		}
		respondJSON(w, http.StatusOK, delivery)
	}
}

func MarkPickedUp(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, "PICKED_UP")
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to mark picked up")
			return
		}
		respondJSON(w, http.StatusOK, delivery)
	}
}

func StartDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, "IN_TRANSIT")
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to start delivery")
			return
		}
		respondJSON(w, http.StatusOK, delivery)
	}
}

func CompleteDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, "DELIVERED")
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to complete delivery")
			return
		}
		respondJSON(w, http.StatusOK, delivery)
	}
}
