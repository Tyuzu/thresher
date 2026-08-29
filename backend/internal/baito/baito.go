package baito

import (
	"net/http"
	"strings"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"
	"scav/utils/logger"
)

/* ------------------ DELETE ------------------ */
func DeleteBaito(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		baitoID := utils.GetParam(r, "baitoid")

		deletedCount, err := deleteBaitoRecord(ctx, app, baitoID, userID)
		if err != nil {
			logger.Printf("Delete error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete baito")
			return
		}

		if deletedCount == 0 {
			utils.RespondWithError(w, http.StatusForbidden, "Baito not found or unauthorized")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BaitoDeletedEvent, mqevent.BaitoDeletedPayload{})

		utils.RespondWithJSON(w, http.StatusNoContent, map[string]string{})
	}
}

/* ------------------ APPLY ------------------ */

func ApplyToBaito(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if err := ParseMultipartFormWithLimit(r); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid form data")
			return
		}
		defer r.MultipartForm.RemoveAll()

		pitch := strings.TrimSpace(r.FormValue("pitch"))
		if pitch == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Pitch message required")
			return
		}

		appx := BaitoApplication{
			BaitoID:     utils.GetParam(r, "baitoid"),
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

		if err := incrementBaitoApplicationCount(ctx, app, utils.GetParam(r, "baitoid")); err != nil {
			logger.Printf("Failed to update application count for baito %s: %v", utils.GetParam(r, "baitoid"), err)
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.AppliedToBaitoEvent, mqevent.AppliedToBaitoPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Application submitted",
		})
	}
}
