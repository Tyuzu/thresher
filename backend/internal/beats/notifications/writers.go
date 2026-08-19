// writers.go
package notifications

// /* =========================
//    CREATE NOTIFICATION
// ========================= */

// func CreateNotification(app *infra.Deps) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
// 		defer cancel()

// 		var body struct {
// 			UserID  string `json:"userid"`
// 			Title   string `json:"title"`
// 			Message string `json:"message"`
// 			Type    string `json:"type"`
// 		}

// 		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
// 			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
// 			return
// 		}

// 		if strings.TrimSpace(body.UserID) == "" || strings.TrimSpace(body.Message) == "" {
// 			utils.RespondWithError(w, http.StatusBadRequest, "userid and message are required")
// 			return
// 		}

// 		notifType := strings.TrimSpace(body.Type)
// 		if notifType == "" {
// 			notifType = "system"
// 		}

// 		notif := Notification{
// 			NotificationID: utils.GenerateRandomString(18),
// 			UserID:         body.UserID,
// 			Title:          strings.TrimSpace(body.Title),
// 			Message:        strings.TrimSpace(body.Message),
// 			Type:           notifType,
// 			IsRead:         false,
// 			CreatedAt:      time.Now(),
// 			UpdatedAt:      time.Now(),
// 		}

// 		if err := insertNotification(ctx, app.DB, notif); err != nil {
// 			utils.RespondWithError(w, http.StatusInternalServerError, "DB insert failed")
// 			return
// 		}

// 		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.NotificationCreatedEvent, notif)

// 		utils.RespondWithJSON(w, http.StatusCreated, notif)
// 	}
// }

// /* =========================
//    BULK CREATE NOTIFICATIONS
// ========================= */

// func BulkCreateNotifications(app *infra.Deps) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
// 		defer cancel()

// 		var body struct {
// 			UserIDs []string `json:"userids"`
// 			Title   string   `json:"title"`
// 			Message string   `json:"message"`
// 			Type    string   `json:"type"`
// 		}

// 		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
// 			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
// 			return
// 		}

// 		if len(body.UserIDs) == 0 || strings.TrimSpace(body.Message) == "" {
// 			utils.RespondWithError(w, http.StatusBadRequest, "userids and message are required")
// 			return
// 		}

// 		notifType := strings.TrimSpace(body.Type)
// 		if notifType == "" {
// 			notifType = "system"
// 		}

// 		now := time.Now()
// 		var notifications []Notification

// 		for _, uid := range body.UserIDs {
// 			if strings.TrimSpace(uid) == "" {
// 				continue
// 			}
// 			notifications = append(notifications, Notification{
// 				NotificationID: utils.GenerateRandomString(18),
// 				UserID:         uid,
// 				Title:          strings.TrimSpace(body.Title),
// 				Message:        strings.TrimSpace(body.Message),
// 				Type:           notifType,
// 				IsRead:         false,
// 				CreatedAt:      now,
// 				UpdatedAt:      now,
// 			})
// 		}

// 		if len(notifications) == 0 {
// 			utils.RespondWithError(w, http.StatusBadRequest, "No valid userids provided")
// 			return
// 		}

// 		if err := insertBulkNotifications(ctx, app.DB, notifications); err != nil {
// 			utils.RespondWithError(w, http.StatusInternalServerError, "DB bulk insert failed")
// 			return
// 		}

// 		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
// 			"count": len(notifications),
// 		})
// 	}
// }
