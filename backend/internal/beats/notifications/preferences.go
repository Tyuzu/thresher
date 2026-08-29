package notifications

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"scav/infra"
	"scav/utils"
)

/* =========================
   UPDATE PREFERENCES
========================= */

func UpdatePreferences(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}

		var body struct {
			EmailNotifs *bool `json:"emailNotifs"`
			PushNotifs  *bool `json:"pushNotifs"`
			InAppNotifs *bool `json:"inAppNotifs"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		// Fetch existing preferences or fallback to defaults.
		var pref NotificationPreferences
		err := findPreferencesByUser(ctx, app.DB, userID, &pref)

		if err != nil && !isNoDocumentsError(err) {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB error")
			return
		}

		if isNoDocumentsError(err) {
			pref = NotificationPreferences{
				UserID:      userID,
				EmailNotifs: true,
				PushNotifs:  true,
				InAppNotifs: true,
			}
		}

		if body.EmailNotifs != nil {
			pref.EmailNotifs = *body.EmailNotifs
		}

		if body.PushNotifs != nil {
			pref.PushNotifs = *body.PushNotifs
		}

		if body.InAppNotifs != nil {
			pref.InAppNotifs = *body.InAppNotifs
		}

		pref.UpdatedAt = time.Now()

		if _, err := upsertPreferences(ctx, app.DB, pref); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to update preferences",
			)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, pref)
	}
}
