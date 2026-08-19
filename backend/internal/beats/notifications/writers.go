package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
)

/* =========================
   CREATE NOTIFICATION
========================= */

func CreateNotification(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var body struct {
			UserID  string `json:"userid"`
			Title   string `json:"title"`
			Message string `json:"message"`
			Type    string `json:"type"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.Message) == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "userid and message are required")
			return
		}

		notifType := strings.TrimSpace(body.Type)
		if notifType == "" {
			notifType = "system"
		}

		notif := Notification{
			NotificationID: utils.GenerateRandomString(18),
			UserID:         body.UserID,
			Title:          strings.TrimSpace(body.Title),
			Message:        strings.TrimSpace(body.Message),
			Type:           notifType,
			IsRead:         false,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		if err := insertNotification(ctx, app.DB, notif); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB insert failed")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.NotificationCreatedEvent, notif)

		utils.RespondWithJSON(w, http.StatusCreated, notif)
	}
}

/* =========================
   BULK CREATE NOTIFICATIONS
========================= */

func BulkCreateNotifications(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var body struct {
			UserIDs []string `json:"userids"`
			Title   string   `json:"title"`
			Message string   `json:"message"`
			Type    string   `json:"type"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		if len(body.UserIDs) == 0 || strings.TrimSpace(body.Message) == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "userids and message are required")
			return
		}

		notifType := strings.TrimSpace(body.Type)
		if notifType == "" {
			notifType = "system"
		}

		now := time.Now()
		var notifications []Notification

		for _, uid := range body.UserIDs {
			if strings.TrimSpace(uid) == "" {
				continue
			}
			notifications = append(notifications, Notification{
				NotificationID: utils.GenerateRandomString(18),
				UserID:         uid,
				Title:          strings.TrimSpace(body.Title),
				Message:        strings.TrimSpace(body.Message),
				Type:           notifType,
				IsRead:         false,
				CreatedAt:      now,
				UpdatedAt:      now,
			})
		}

		if len(notifications) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "No valid userids provided")
			return
		}

		if err := insertBulkNotifications(ctx, app.DB, notifications); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB bulk insert failed")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"count": len(notifications),
		})
	}
}

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

		// Fetch existing preferences or fallback to defaults
		var pref NotificationPreferences
		err := findPreferencesByUser(ctx, app.DB, userID, &pref)
		if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
			utils.RespondWithError(w, http.StatusInternalServerError, "DB error")
			return
		}

		if errors.Is(err, mongo.ErrNoDocuments) {
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
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update preferences")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, pref)
	}
}
