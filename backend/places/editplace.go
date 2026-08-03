package places

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/beats/dels"
	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"

	"naevis/places/repo"
	pu "naevis/places/usecase"
)

// --- EditPlace endpoint ---
func EditPlace(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		placeID := strings.TrimSpace(utils.GetParam(r, "placeid"))
		if placeID == "" {
			http.Error(w, "Place ID is required", http.StatusBadRequest)
			return
		}

		requestingUserID, ok := ctx.Value(config.UserIDKey).(string)
		if !ok {
			http.Error(w, "Invalid user", http.StatusUnauthorized)
			return
		}

		// Fetch existing place via usecase
		repoImpl := repo.NewMongoRepo(app.DB)
		uc := pu.NewPlacesUsecase(repoImpl)

		existing, err := uc.GetPlace(ctx, placeID)
		if err != nil {
			http.Error(w, "Place not found", http.StatusNotFound)
			return
		}

		if existing.CreatedBy != requestingUserID {
			http.Error(w, "You are not authorized to edit this place", http.StatusForbidden)
			return
		}

		// Parse update fields
		_, updateFields, err := parseAndBuildPlace(r, "update")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if len(updateFields) == 0 {
			http.Error(w, "No fields to update", http.StatusBadRequest)
			return
		}

		updateFields["updated_at"] = time.Now()
		updateFields["updatedBy"] = requestingUserID

		// Update via usecase
		if err := uc.EditPlace(ctx, placeID, updateFields); err != nil {
			http.Error(w, "Failed to update place", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.PlaceUpdatedPayload{})
		app.MQ.Publish(ctx, mqevent.PlaceUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, updateFields)
	}
}

// --- DeletePlace endpoint ---
func DeletePlace(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Delegate to your dels.DeletePlace logic, which should handle DB + cache
		dels.DeletePlace(app)
	}
}
