package deliveries

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/utils"
)

func updateDeliveryStatus(app *infra.Deps, r *http.Request, deliveryID string, newStatus string) (*Delivery, error) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)
	tenantID := GetTenantIDFromContext(ctx)

	// Fetch existing status to validate transition
	var currentDelivery Delivery
	filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
	if err := app.DB.FindOne(ctx, "deliveries", filter, &currentDelivery); err != nil {
		return nil, fmt.Errorf("delivery not found")
	}

	if err := ValidateTransition(currentDelivery.Status, newStatus); err != nil {
		return nil, err
	}

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"status":     newStatus,
			"updated_at": now,
		},
		"$push": bson.M{
			"status_history": StatusHistoryItem{
				Status:    newStatus,
				Timestamp: now,
				UpdatedBy: userID,
			},
		},
	}

	var updatedDelivery Delivery
	err := app.DB.FindOneAndUpdate(ctx, "deliveries", filter, update, &updatedDelivery)
	if err != nil {
		return nil, err
	}

	_ = app.Cache.Del(ctx, fmt.Sprintf("delivery:%s", deliveryID))
	_ = app.NatsConn.Publish(fmt.Sprintf("deliveries.status.%s", newStatus), []byte(deliveryID))

	return &updatedDelivery, nil
}

func CreateDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			PickupLoc  Location `json:"pickup_loc"`
			DropoffLoc Location `json:"dropoff_loc"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		ctx := r.Context()
		now := time.Now()
		deliveryID := utils.GenerateRandomString(18)

		delivery := Delivery{
			DeliveryID:          deliveryID,
			UserID:              utils.GetUserIDFromRequest(r),
			TenantID:            GetTenantIDFromContext(ctx),
			Status:              StatusCreated,
			PickupLoc:           req.PickupLoc,
			DropoffLoc:          req.DropoffLoc,
			PublicTrackingToken: utils.GenerateRandomString(32),
			CreatedAt:           now,
			UpdatedAt:           now,
			StatusHistory: []StatusHistoryItem{
				{
					Status:    StatusCreated,
					Timestamp: now,
					UpdatedBy: utils.GetUserIDFromRequest(r),
				},
			},
		}

		if err := app.DB.InsertOne(ctx, "deliveries", delivery); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create delivery")
			return
		}

		_ = app.NatsConn.Publish("deliveries.created", []byte(delivery.DeliveryID))
		utils.RespondWithJSON(w, http.StatusCreated, delivery)
	}
}

func GetMyDeliveries(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		tenantID := GetTenantIDFromContext(ctx)

		filter := bson.M{"user_id": userID, "tenant_id": tenantID}
		var myDeliveries []Delivery

		if err := app.DB.FindMany(ctx, "deliveries", filter, &myDeliveries); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch deliveries")
			return
		}
		if len(myDeliveries) == 0 {
			myDeliveries = []Delivery{}
		}
		utils.RespondWithJSON(w, http.StatusOK, myDeliveries)
	}
}

func GetDeliveryByID(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := GetTenantIDFromContext(r.Context())
		if deliveryID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing delivery ID")
			return
		}

		ctx := r.Context()
		cacheKey := fmt.Sprintf("delivery:%s", deliveryID)

		if cached, err := app.Cache.Get(ctx, cacheKey); err == nil && len(cached) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(cached)
			return
		}

		var delivery Delivery
		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
		if err := app.DB.FindOne(ctx, "deliveries", filter, &delivery); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Delivery not found")
			return
		}

		if bytes, err := json.Marshal(delivery); err == nil {
			_ = app.Cache.Set(ctx, cacheKey, bytes, 15*time.Minute)
		}

		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}

func CancelDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, StatusCancelled)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}

func AssignDriver(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		tenantID := GetTenantIDFromContext(r.Context())

		var req struct {
			DriverID string `json:"driver_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		ctx := r.Context()
		var current Delivery
		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID}
		if err := app.DB.FindOne(ctx, "deliveries", filter, &current); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Delivery not found")
			return
		}

		if err := ValidateTransition(current.Status, StatusAssigned); err != nil {
			utils.RespondWithError(w, http.StatusConflict, err.Error())
			return
		}

		now := time.Now()
		update := bson.M{
			"$set": bson.M{
				"driver_id":  req.DriverID,
				"status":     StatusAssigned,
				"updated_at": now,
			},
			"$push": bson.M{
				"status_history": StatusHistoryItem{
					Status:    StatusAssigned,
					Timestamp: now,
					UpdatedBy: utils.GetUserIDFromRequest(r),
				},
			},
		}

		var updated Delivery
		if err := app.DB.FindOneAndUpdate(ctx, "deliveries", filter, update, &updated); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to assign driver")
			return
		}

		_ = app.Cache.Del(ctx, fmt.Sprintf("delivery:%s", deliveryID))
		utils.RespondWithJSON(w, http.StatusOK, updated)
	}
}

func AcceptAssignment(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, StatusAccepted)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}

func MarkPickedUp(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, StatusPickedUp)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}

func StartDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, StatusInTransit)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}

func CompleteDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := utils.GetParam(r, "deliveryid")
		delivery, err := updateDeliveryStatus(app, r, deliveryID, StatusDelivered)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}
