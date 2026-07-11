package jobs

import (
	"encoding/json"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

// ------------------ CREATE ------------------
func CreateBaitoForEntity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)

		entityType := ps.ByName("entitytype")
		entityID := ps.ByName("entityid")

		var baito models.Baito
		if err := json.NewDecoder(r.Body).Decode(&baito); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		// Required field validation
		if baito.Title == "" ||
			baito.Description == "" ||
			baito.Category == "" ||
			baito.SubCategory == "" ||
			baito.Location == "" ||
			baito.Wage == "" {

			utils.RespondWithError(w, http.StatusBadRequest, "Missing required fields")
			return
		}

		// Safe defaults
		if baito.Images == nil {
			baito.Images = []string{}
		}
		if baito.Tags == nil {
			baito.Tags = []string{}
		}

		// Assign controlled/system values
		now := time.Now()
		dueDate := now.AddDate(0, 1, 0)
		baito.BaitoId = utils.GenerateRandomString(15)
		baito.EntityType = entityType
		baito.EntityID = entityID
		baito.OwnerID = userID
		baito.CreatedAt = now
		baito.UpdatedAt = now
		baito.LastDateToApply = &dueDate
		baito.ApplicationCount = 0

		// Insert using Database interface
		if err := app.DB.Insert(ctx, baitosCollection, baito); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to save baito")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.JobCreatedPayload{})
		app.MQ.Publish(ctx, mqevent.JobCreated, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"baitoid": baito.BaitoId})
	}
}
