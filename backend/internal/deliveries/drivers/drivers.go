package drivers

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

func GetProfile(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var driver deliveries.Driver
		filter := bson.M{"_id": driverID, "tenant_id": tenantID}
		if err := app.DB.FindOne(ctx, "drivers", filter, &driver); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Driver profile not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, driver)
	}
}

func UpdateProfile(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())

		var updates bson.M
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid body")
			return
		}

		ctx := r.Context()
		delete(updates, "_id")
		delete(updates, "tenant_id")
		updates["updated_at"] = time.Now()

		filter := bson.M{"_id": driverID, "tenant_id": tenantID}
		if _, err := app.DB.UpdateOne(ctx, "drivers", filter, bson.M{"$set": updates}); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update driver")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}
}

func GoOnline(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		_ = app.Cache.HSet(ctx, "drivers:online", driverID, []byte("true"))
		filter := bson.M{"_id": driverID, "tenant_id": tenantID}
		_, _ = app.DB.UpdateOne(ctx, "drivers", filter, bson.M{"$set": bson.M{"is_online": true}})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "online"})
	}
}

func GoOffline(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		_, _ = app.Cache.HDel(ctx, "drivers:online", driverID)
		filter := bson.M{"_id": driverID, "tenant_id": tenantID}
		_, _ = app.DB.UpdateOne(ctx, "drivers", filter, bson.M{"$set": bson.M{"is_online": false}})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "offline"})
	}
}

func GetStatus(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var status bson.M
		filter := bson.M{"_id": driverID, "tenant_id": tenantID}
		if err := app.DB.FindOneWithProjection(ctx, "drivers", filter, []string{"is_online", "current_state"}, &status); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Driver status unavailable")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, status)
	}
}

func GetAvailableJobs(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var jobs []deliveries.Delivery
		filter := bson.M{
			"status":    "CREATED",
			"driver_id": nil,
			"tenant_id": tenantID,
		}

		if err := app.DB.FindMany(ctx, "deliveries", filter, &jobs); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch available jobs")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, jobs)
	}
}

func GetActiveDeliveries(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var active []deliveries.Delivery
		filter := bson.M{
			"driver_id": driverID,
			"tenant_id": tenantID,
			"status":    bson.M{"$in": []string{"ACCEPTED", "PICKED_UP", "IN_TRANSIT"}},
		}

		if err := app.DB.FindMany(ctx, "deliveries", filter, &active); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch active deliveries")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, active)
	}
}

func AcceptJob(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		deliveryID := deliveries.GetParam(r, "deliveryid")
		ctx := r.Context()

		now := time.Now()
		filter := bson.M{"_id": deliveryID, "tenant_id": tenantID, "status": "CREATED"}
		update := bson.M{
			"$set": bson.M{
				"status":     "ACCEPTED",
				"driver_id":  driverID,
				"updated_at": now,
			},
			"$push": bson.M{
				"status_history": deliveries.StatusHistoryItem{
					Status:    "ACCEPTED",
					Timestamp: now,
					UpdatedBy: driverID,
				},
			},
		}

		var delivery deliveries.Delivery
		if err := app.DB.FindOneAndUpdate(ctx, "deliveries", filter, update, &delivery); err != nil {
			utils.RespondWithError(w, http.StatusConflict, "Job no longer available or invalid")
			return
		}

		_ = app.Cache.Del(ctx, fmt.Sprintf("delivery:%s", deliveryID))
		utils.RespondWithJSON(w, http.StatusOK, delivery)
	}
}

func RejectJob(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		deliveryID := deliveries.GetParam(r, "deliveryid")
		ctx := r.Context()

		_ = app.DB.InsertOne(ctx, "driver_job_rejections", bson.M{
			"rejection_id": utils.GenerateRandomString(18),
			"tenant_id":    tenantID,
			"driver_id":    driverID,
			"delivery_id":  deliveryID,
			"rejected_at":  time.Now(),
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
	}
}

func SendGPSLocation(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		var loc deliveries.GPSData
		if err := json.NewDecoder(r.Body).Decode(&loc); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid payload")
			return
		}
		loc.Timestamp = time.Now()

		ctx := r.Context()
		bytes, _ := json.Marshal(loc)

		_ = app.Cache.Set(ctx, fmt.Sprintf("gps:driver:%s", driverID), bytes, 1*time.Hour)
		_ = app.NatsConn.Publish(fmt.Sprintf("drivers.location.%s", driverID), bytes)

		utils.RespondWithJSON(w, http.StatusAccepted, map[string]string{"status": "location_updated"})
	}
}

func GetCurrentGPS(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		driverID := deliveries.GetDriverIDFromContext(r.Context())
		ctx := r.Context()

		val, err := app.Cache.Get(ctx, fmt.Sprintf("gps:driver:%s", driverID))
		if err != nil || len(val) == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "No recent GPS data found")
			return
		}

		var loc deliveries.GPSData
		_ = json.Unmarshal(val, &loc)
		utils.RespondWithJSON(w, http.StatusOK, loc)
	}
}
