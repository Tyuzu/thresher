package notifications

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"scav/infra"
	db "scav/infra/db"
	"scav/utils"
)

/* =========================
   HTTP HANDLERS
========================= */

// GET USER NOTIFICATIONS
func GetUserNotifications(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "User ID is required")
			return
		}

		/* ---------- Pagination ---------- */
		page := 1
		limit := 20

		if v := r.URL.Query().Get("page"); v != "" {
			if p, err := strconv.Atoi(v); err == nil && p > 0 {
				page = p
			}
		}

		if v := r.URL.Query().Get("limit"); v != "" {
			if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 100 {
				limit = l
			}
		}

		skip := (page - 1) * limit

		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  skip,
			Sort:  notificationSort(),
		}

		var notifs []Notification

		if err := findNotificationsByUser(
			ctx,
			app.DB,
			userID,
			opts,
			&notifs,
		); err != nil {
			utils.RespondWithJSON(
				w,
				http.StatusInternalServerError,
				map[string]string{
					"message": "Failed to fetch notifications",
				},
			)
			return
		}

		if notifs == nil {
			notifs = []Notification{}
		}

		utils.RespondWithJSON(w, http.StatusOK, notifs)
	}
}

// GET UNREAD COUNT
func GetUnreadCount(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "User ID is required")
			return
		}

		count, err := countUnreadNotifications(ctx, app.DB, userID)
		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to count unread notifications",
			)
			return
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]int64{"unreadCount": count},
		)
	}
}

// GET PREFERENCES
func GetPreferences(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "User ID is required")
			return
		}

		var pref NotificationPreferences

		err := findPreferencesByUser(ctx, app.DB, userID, &pref)

		if err != nil {
			if isNoDocumentsError(err) {
				pref = NotificationPreferences{
					UserID:      userID,
					EmailNotifs: true,
					PushNotifs:  true,
					InAppNotifs: true,
					UpdatedAt:   time.Now(),
				}

				utils.RespondWithJSON(w, http.StatusOK, pref)
				return
			}

			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to fetch preferences",
			)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, pref)
	}
}
