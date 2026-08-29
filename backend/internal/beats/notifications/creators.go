package notifications

import (
	"context"
	"errors"
	"strings"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"
)

// CreateNotificationParams holds the payload required to send a single notification.
type CreateNotificationParams struct {
	UserID  string
	Title   string
	Message string
	Type    string
}

// BulkCreateNotificationParams holds the payload required to send notifications to multiple users.
type BulkCreateNotificationParams struct {
	UserIDs []string
	Title   string
	Message string
	Type    string
}

/* =========================
   CREATE NOTIFICATION
========================= */

// Create Notification creates and persists a single notification, then publishes an MQ event.
func Create(ctx context.Context, app *infra.Deps, params CreateNotificationParams) (*Notification, error) {
	userID := strings.TrimSpace(params.UserID)
	message := strings.TrimSpace(params.Message)

	if userID == "" || message == "" {
		return nil, errors.New("userid and message are required")
	}

	notifType := strings.TrimSpace(params.Type)
	if notifType == "" {
		notifType = "system"
	}

	notif := Notification{
		NotificationID: utils.GenerateRandomString(18),
		UserID:         userID,
		Title:          strings.TrimSpace(params.Title),
		Message:        message,
		Type:           notifType,
		IsRead:         false,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := insertNotification(ctx, app.DB, notif); err != nil {
		return nil, err
	}

	_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.NotificationCreatedEvent, notif)

	return &notif, nil
}

/* =========================
   BULK CREATE NOTIFICATIONS
========================= */

// CreateBulk creates and persists notifications for multiple user IDs.
func CreateBulk(ctx context.Context, app *infra.Deps, params BulkCreateNotificationParams) ([]Notification, error) {
	message := strings.TrimSpace(params.Message)
	if len(params.UserIDs) == 0 || message == "" {
		return nil, errors.New("userids and message are required")
	}

	notifType := strings.TrimSpace(params.Type)
	if notifType == "" {
		notifType = "system"
	}

	now := time.Now()
	var notifications []Notification

	for _, uid := range params.UserIDs {
		trimmedUID := strings.TrimSpace(uid)
		if trimmedUID == "" {
			continue
		}
		notifications = append(notifications, Notification{
			NotificationID: utils.GenerateRandomString(18),
			UserID:         trimmedUID,
			Title:          strings.TrimSpace(params.Title),
			Message:        message,
			Type:           notifType,
			IsRead:         false,
			CreatedAt:      now,
			UpdatedAt:      now,
		})
	}

	if len(notifications) == 0 {
		return nil, errors.New("no valid userids provided")
	}

	if err := insertBulkNotifications(ctx, app.DB, notifications); err != nil {
		return nil, err
	}

	return notifications, nil
}
