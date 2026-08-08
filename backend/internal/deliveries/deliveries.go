package deliveries

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"naevis/infra"
)

type Delivery struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TenantID   string             `bson:"tenant_id" json:"tenant_id"`
	UserID     string             `bson:"user_id" json:"user_id"`
	DriverID   *string            `bson:"driver_id,omitempty" json:"driver_id,omitempty"`
	Status     string             `bson:"status" json:"status"`
	PickupLoc  Location           `bson:"pickup_loc" json:"pickup_loc"`
	DropoffLoc Location           `bson:"dropoff_loc" json:"dropoff_loc"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at"`
}

type Location struct {
	Lat float64 `bson:"lat" json:"lat"`
	Lng float64 `bson:"lng" json:"lng"`
}

// Helpers
func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func getPathParam(r *http.Request, key string) string {
	params := httprouter.ParamsFromContext(r.Context())
	return params.ByName(key)
}

func CreateDelivery(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			PickupLoc  Location `json:"pickup_loc"`
			DropoffLoc Location `json:"dropoff_loc"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		delivery := Delivery{
			ID:         primitive.NewObjectID(),
			UserID:     r.Header.Get("X-User-ID"), // Or extract from Context/Auth middleware
			TenantID:   r.Header.Get("X-Tenant-ID"),
			Status:     "CREATED",
			PickupLoc:  req.PickupLoc,
			DropoffLoc: req.DropoffLoc,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		ctx := r.Context()
		if err := app.DB.InsertOne(ctx, "deliveries", delivery); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to create delivery")
			return
		}

		// Publish event
		_ = app.NatsConn.Publish("deliveries.created", []byte(delivery.ID.Hex()))

		respondJSON(w, http.StatusCreated, delivery)
	}
}

func GetDeliveryByID(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deliveryID := getPathParam(r, "deliveryid")
		if deliveryID == "" {
			respondError(w, http.StatusBadRequest, "Missing delivery ID")
			return
		}

		ctx := r.Context()
		cacheKey := fmt.Sprintf("delivery:%s", deliveryID)

		// 1. Try Cache First
		if cached, err := app.Cache.Get(ctx, cacheKey); err == nil && len(cached) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(cached)
			return
		}

		// 2. Fallback to DB
		objID, err := primitive.ObjectIDFromHex(deliveryID)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid delivery ID format")
			return
		}

		var delivery Delivery
		if err := app.DB.FindOne(ctx, "deliveries", bson.M{"_id": objID}, &delivery); err != nil {
			respondError(w, http.StatusNotFound, "Delivery not found")
			return
		}

		// 3. Update Cache
		if bytes, err := json.Marshal(delivery); err == nil {
			_ = app.Cache.Set(ctx, cacheKey, bytes, 15*time.Minute)
		}

		respondJSON(w, http.StatusOK, delivery)
	}
}
