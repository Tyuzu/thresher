// updaters.go
package notifications

import (
	"context"
	"scav/infra"
	"scav/utils"
	"net/http"
	"time"
)

/* =========================
   MARK SINGLE AS READ
========================= */

func MarkAsRead(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		notificationID := utils.GetParam(r, "notificationid")
		if notificationID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid notification ID")
			return
		}

		if _, err := updateMarkAsRead(ctx, app.DB, notificationID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to mark as read")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Notification marked as read"})
	}
}

/* =========================
   MARK ALL AS READ
========================= */

func MarkAllAsRead(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		// Auth user ID from context/JWT
		authUserID := utils.GetUserIDFromRequest(r)
		if authUserID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Optional target user ID from path param if administrative overrides exist
		targetUserID := utils.GetParam(r, "userid")
		if targetUserID == "" {
			targetUserID = authUserID
		}

		if targetUserID != authUserID {
			utils.RespondWithError(w, http.StatusForbidden, "Forbidden")
			return
		}

		if _, err := updateMarkAllAsRead(ctx, app.DB, targetUserID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to mark all as read")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "All notifications marked as read"})
	}
}

/* =========================
   DELETE NOTIFICATION
========================= */

func DeleteNotification(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		notificationID := utils.GetParam(r, "notificationid")
		if notificationID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		count, err := deleteNotificationByID(ctx, app.DB, notificationID)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Delete failed")
			return
		}
		if count == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "Notification not found")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

/* =========================
   CLEAR ALL NOTIFICATIONS
========================= */

func ClearAllNotifications(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		if err := deleteAllNotificationsByUser(ctx, app.DB, userID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Clear notifications failed")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
