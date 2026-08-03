package places

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// UpdatePlaceInfo updates accessibility and amenities for a place
func UpdatePlaceInfo(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		placeID := strings.TrimSpace(utils.GetParam(r, "placeid"))
		if placeID == "" {
			http.Error(w, "Place ID is required", http.StatusBadRequest)
			return
		}

		userID, ok := ctx.Value(config.UserIDKey).(string)
		if !ok {
			http.Error(w, "Invalid user", http.StatusUnauthorized)
			return
		}

		// Fetch existing place (use placeid, NOT _id)
		var existing struct {
			CreatedBy string `bson:"createdby"`
		}
		if err := app.DB.FindOne(
			ctx,
			placesCollection,
			bson.M{"placeid": placeID},
			&existing,
		); err != nil {
			http.Error(w, "Place not found", http.StatusNotFound)
			return
		}

		if existing.CreatedBy != userID {
			http.Error(w, "Not authorized", http.StatusForbidden)
			return
		}

		// Parse JSON payload
		var payload struct {
			AccessibilityInfo string   `json:"accessibilityinfo"`
			Amenities         []string `json:"amenities"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		update := bson.M{}

		if payload.AccessibilityInfo != "" {
			update["accessibilityinfo"] = payload.AccessibilityInfo
		}

		if len(payload.Amenities) > 0 {
			set := map[string]struct{}{}
			for _, a := range payload.Amenities {
				a = strings.TrimSpace(a)
				if a != "" {
					set[a] = struct{}{}
				}
			}

			if len(set) > 0 {
				amenities := make([]string, 0, len(set))
				for a := range set {
					amenities = append(amenities, a)
				}
				update["amenities"] = amenities
			}
		}

		if len(update) == 0 {
			http.Error(w, "No fields to update", http.StatusBadRequest)
			return
		}

		update["updatedat"] = time.Now()
		update["updatedBy"] = userID

		// ✅ Pass plain fields (DB layer adds $set)
		if err := app.DB.Update(
			ctx,
			placesCollection,
			bson.M{"placeid": placeID},
			update,
		); err != nil {
			http.Error(w, "Failed to update place info", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.PlaceUpdatedPayload{})
		app.MQ.Publish(ctx, mqevent.PlaceUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, update)
	}
}
