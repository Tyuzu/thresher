package baito

import (
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	inmq "naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"naevis/utils/logger"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo"
)

/* ------------------ DELETE ------------------ */

func DeleteBaito(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		baitoID := ps.ByName("baitoid")

		err := deleteBaitoRecord(ctx, app, baitoID, userID)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				utils.RespondWithError(w, http.StatusForbidden, "Baito not found or unauthorized")
				return
			}
			logger.Printf("Delete error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete baito")
			return
		}

		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.BaitoRemovedEvent, mqevent.BaitoRemovedPayload{})

		utils.RespondWithJSON(w, http.StatusNoContent, map[string]string{})
	}
}

/* ------------------ APPLY ------------------ */

func ApplyToBaito(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		if err := parseMultipartFormWithLimit(r); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid form data")
			return
		}
		defer r.MultipartForm.RemoveAll()

		pitch := strings.TrimSpace(r.FormValue("pitch"))
		if pitch == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Pitch message required")
			return
		}

		appx := models.BaitoApplication{
			BaitoID:     ps.ByName("baitoid"),
			UserID:      utils.GetUserIDFromRequest(r),
			Username:    utils.GetUsernameFromRequest(r),
			Pitch:       pitch,
			SubmittedAt: time.Now(),
		}

		if err := saveBaitoApplication(ctx, app, appx); err != nil {
			logger.Printf("Insert error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to save application")
			return
		}

		if err := incrementBaitoApplicationCount(ctx, app, ps.ByName("baitoid")); err != nil {
			logger.Printf("Failed to update application count for baito %s: %v", ps.ByName("baitoid"), err)
		}

		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.AppliedToBaitoEvent, mqevent.AppliedToBaitoPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Application submitted",
		})
	}
}
