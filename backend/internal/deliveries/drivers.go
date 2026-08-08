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

func GetProfile(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		ctx := r.Context()

		var driver bson.M
		if err := app.DB.FindOne(ctx, "drivers", bson.M{"driver_id": driverID}, &driver); err != nil {
			respondError(w, http.StatusNotFound, "Driver profile not found")
			return
		}
		respondJSON(w, http.StatusOK, driver)
	}
}

func UpdateProfile(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		var updates bson.M
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid body")
			return
		}

		ctx := r.Context()
		delete(updates, "_id") // safety
		updates["updated_at"] = time.Now()

		if _, err := app.DB.UpdateOne(ctx, "drivers", bson.M{"driver_id": driverID}, bson.M{"$set": updates}); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to update driver")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}
}

func GoOnline(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		ctx := r.Context()

		_ = app.Cache.HSet(ctx, "drivers:online", driverID, []byte("true"))
		_, _ = app.DB.UpdateOne(ctx, "drivers", bson.M{"driver_id": driverID}, bson.M{"$set": bson.M{"is_online": true}})

		respondJSON(w, http.StatusOK, map[string]string{"status": "online"})
	}
}

func GoOffline(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		ctx := r.Context()

		_, _ = app.Cache.HDel(ctx, "drivers:online", driverID)
		_, _ = app.DB.UpdateOne(ctx, "drivers", bson.M{"driver_id": driverID}, bson.M{"$set": bson.M{"is_online": false}})

		respondJSON(w, http.StatusOK, map[string]string{"status": "offline"})
	}
}

func GetStatus(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		ctx := r.Context()

		var status bson.M
		if err := app.DB.FindOneWithProjection(ctx, "drivers", bson.M{"driver_id": driverID}, []string{"is_online", "current_state"}, &status); err != nil {
			respondError(w, http.StatusNotFound, "Driver status unavailable")
			return
		}
		respondJSON(w, http.StatusOK, status)
	}
}

func GetAvailableJobs(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var jobs []Delivery
		filter := bson.M{"status": "CREATED", "driver_id": nil}

		if err := app.DB.FindMany(ctx, "deliveries", filter, &jobs); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch available jobs")
			return
		}
		respondJSON(w, http.StatusOK, jobs)
	}
}

func GetActiveDeliveries(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		ctx := r.Context()
		var active []Delivery
		filter := bson.M{
			"driver_id": driverID,
			"status":    bson.M{"$in": []string{"ACCEPTED", "PICKED_UP", "IN_TRANSIT"}},
		}

		if err := app.DB.FindMany(ctx, "deliveries", filter, &active); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch active deliveries")
			return
		}
		respondJSON(w, http.StatusOK, active)
	}
}

func AcceptJob(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		objID, _ := primitive.ObjectIDFromHex(deliveryID)
		filter := bson.M{"_id": objID, "status": "CREATED"}
		update := bson.M{"$set": bson.M{"status": "ACCEPTED", "driver_id": driverID, "updated_at": time.Now()}}

		var delivery Delivery
		if err := app.DB.FindOneAndUpdate(ctx, "deliveries", filter, update, &delivery); err != nil {
			respondError(w, http.StatusConflict, "Job no longer available or invalid")
			return
		}
		respondJSON(w, http.StatusOK, delivery)
	}
}

func RejectJob(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		deliveryID := getPathParam(r, "deliveryid")
		ctx := r.Context()

		// Store rejection in DB/Redis for job matching algorithm
		_ = app.DB.InsertOne(ctx, "driver_job_rejections", bson.M{
			"driver_id":   driverID,
			"delivery_id": deliveryID,
			"rejected_at": time.Now(),
		})

		respondJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
	}
}

func SendGPSLocation(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		var loc GPSData
		if err := json.NewDecoder(r.Body).Decode(&loc); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid payload")
			return
		}
		loc.Timestamp = time.Now()

		ctx := r.Context()
		bytes, _ := json.Marshal(loc)

		// Cache latest GPS location in Redis
		_ = app.Cache.Set(ctx, fmt.Sprintf("gps:driver:%s", driverID), bytes, 1*time.Hour)

		// Stream to NATS JetStream for live tracking consumers
		_ = app.NatsConn.Publish(fmt.Sprintf("drivers.location.%s", driverID), bytes)

		respondJSON(w, http.StatusAccepted, map[string]string{"status": "location_updated"})
	}
}

func GetCurrentGPS(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := r.Header.Get("X-Driver-ID")
		ctx := r.Context()

		val, err := app.Cache.Get(ctx, fmt.Sprintf("gps:driver:%s", driverID))
		if err != nil || len(val) == 0 {
			respondError(w, http.StatusNotFound, "No recent GPS data found")
			return
		}

		var loc GPSData
		_ = json.Unmarshal(val, &loc)
		respondJSON(w, http.StatusOK, loc)
	}
}
