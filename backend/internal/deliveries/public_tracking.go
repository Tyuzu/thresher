package deliveries

import (
	"encoding/json"
	"fmt"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
)

func GetPublicTracking(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := getPathParam(r, "token")
		ctx := r.Context()

		var res bson.M
		filter := bson.M{"public_tracking_token": token}
		proj := []string{"status", "pickup_loc", "dropoff_loc", "estimated_arrival"}

		if err := app.DB.FindOneWithProjection(ctx, "deliveries", filter, proj, &res); err != nil {
			respondError(w, http.StatusNotFound, "Invalid or expired tracking token")
			return
		}

		respondJSON(w, http.StatusOK, res)
	}
}

func GetPublicLocation(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := getPathParam(r, "token")
		ctx := r.Context()

		// Read mapping from cache
		deliveryIDBytes, err := app.Cache.Get(ctx, fmt.Sprintf("token:map:%s", token))
		if err != nil || len(deliveryIDBytes) == 0 {
			respondError(w, http.StatusNotFound, "Tracking token location unavailable")
			return
		}

		locBytes, err := app.Cache.Get(ctx, fmt.Sprintf("location:delivery:%s", string(deliveryIDBytes)))
		if err != nil || len(locBytes) == 0 {
			respondError(w, http.StatusNotFound, "Live location not streaming")
			return
		}

		var loc GPSData
		_ = json.Unmarshal(locBytes, &loc)
		respondJSON(w, http.StatusOK, loc)
	}
}
