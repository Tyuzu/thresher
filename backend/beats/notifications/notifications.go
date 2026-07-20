package notifications

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Handler holds the dependencies required for notification operations.
type Handler struct {
	app *infra.Deps
}

// NewHandler creates a new notifications handler instance.
func NewHandler(app *infra.Deps) *Handler {
	return &Handler{app: app}
}

// CreateRequest represents the incoming request payload for a single notification.
type CreateRequest struct {
	UserID      string `json:"userId"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	EntityType  string `json:"entityType"`
	EntityID    string `json:"entityId"`
	RelatedUser string `json:"relatedUser"`
}

func (req *CreateRequest) Trim() {
	req.UserID = strings.TrimSpace(req.UserID)
	req.Type = strings.TrimSpace(req.Type)
	req.Title = strings.TrimSpace(req.Title)
	req.Message = strings.TrimSpace(req.Message)
	req.EntityType = strings.TrimSpace(req.EntityType)
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.RelatedUser = strings.TrimSpace(req.RelatedUser)
}

// CreateNotification creates a new notification for a user
func (h *Handler) CreateNotification(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var body CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	body.Trim()
	if body.UserID == "" || body.Type == "" || body.Message == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Missing required fields: userId, type, message")
		return
	}

	now := time.Now()
	notification := models.Notification{
		ID:          primitive.NewObjectID().Hex(),
		UserID:      body.UserID,
		Type:        body.Type,
		Title:       body.Title,
		Message:     body.Message,
		EntityType:  body.EntityType,
		EntityID:    body.EntityID,
		RelatedUser: body.RelatedUser,
		IsRead:      false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.app.DB.Insert(ctx, notificationsCollection, notification); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create notification")
		return
	}

	// Logging or handling error for async operations is recommended instead of raw blank identifier
	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.OneNotificationCreatedEvent, mqevent.OneNotificationCreatedPayload{})

	utils.RespondWithJSON(w, http.StatusCreated, notification)
}

// BulkCreateNotifications creates multiple notifications at once
func (h *Handler) BulkCreateNotifications(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var body struct {
		Notifications []CreateRequest `json:"notifications"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if len(body.Notifications) == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "No notifications provided")
		return
	}

	now := time.Now()
	notifications := make([]any, len(body.Notifications))
	for i, n := range body.Notifications {
		n.Trim()
		notifications[i] = models.Notification{
			ID:          primitive.NewObjectID().Hex(),
			UserID:      n.UserID,
			Type:        n.Type,
			Title:       n.Title,
			Message:     n.Message,
			EntityType:  n.EntityType,
			EntityID:    n.EntityID,
			RelatedUser: n.RelatedUser,
			IsRead:      false,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	}

	if err := h.app.DB.InsertMany(ctx, notificationsCollection, notifications); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create notifications")
		return
	}

	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.BulkNotificationsCreatedEvent, mqevent.BulkNotificationsCreatedPayload{})

	utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
		"inserted": len(notifications),
	})
}

// GetUserNotifications retrieves all notifications for a user
func (h *Handler) GetUserNotifications(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := strings.TrimSpace(ps.ByName("userid"))
	if userID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	filter := bson.M{"userid": userID}
	if r.URL.Query().Get("unread") == "true" {
		filter["isRead"] = false
	}

	// Pre-allocating an empty slice guarantees an output of `[]` instead of `null` if Mongo returns empty.
	notifications := make([]models.Notification, 0)
	if err := h.app.DB.FindMany(ctx, notificationsCollection, filter, &notifications); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, notifications)
}

// GetUnreadCount gets count of unread notifications
func (h *Handler) GetUnreadCount(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := strings.TrimSpace(ps.ByName("userid"))
	if userID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	filter := bson.M{"userid": userID, "isRead": false}
	count, err := h.app.DB.CountDocuments(ctx, notificationsCollection, filter)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to count notifications")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, map[string]any{
		"count": count,
	})
}

// MarkAsRead marks a notification as read
func (h *Handler) MarkAsRead(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	notificationID := strings.TrimSpace(ps.ByName("notificationid"))
	if notificationID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	filter := bson.M{"_id": notificationID}
	update := bson.M{
		"$set": bson.M{
			"isRead":    true,
			"updatedAt": time.Now(),
		},
	}

	if err := h.app.DB.UpdateOne(ctx, notificationsCollection, filter, update); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update notification")
		return
	}

	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.OneNotificationReadEvent, mqevent.OneNotificationReadPayload{})

	utils.RespondWithJSON(w, http.StatusOK, map[string]any{
		"updated": true,
	})
}

// MarkAllAsRead marks all notifications as read for a user
func (h *Handler) MarkAllAsRead(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := strings.TrimSpace(ps.ByName("userid"))
	if userID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	filter := bson.M{"userid": userID, "isRead": false}
	update := bson.M{
		"$set": bson.M{
			"isRead":    true,
			"updatedAt": time.Now(),
		},
	}

	if err := h.app.DB.UpdateMany(ctx, notificationsCollection, filter, update); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update notifications")
		return
	}

	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.AllNotificationsReadEvent, mqevent.AllNotificationsReadPayload{})

	utils.RespondWithJSON(w, http.StatusOK, map[string]any{
		"updated": true,
	})
}

// DeleteNotification deletes a notification
func (h *Handler) DeleteNotification(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	notificationID := strings.TrimSpace(ps.ByName("notificationid"))
	if notificationID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	filter := bson.M{"_id": notificationID}
	if _, err := h.app.DB.DeleteOne(ctx, notificationsCollection, filter); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete notification")
		return
	}

	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.NotificationDeletedEvent, mqevent.NotificationDeletedPayload{})

	utils.RespondWithJSON(w, http.StatusOK, map[string]any{
		"deleted": true,
	})
}

// ClearAllNotifications deletes all notifications for a user
func (h *Handler) ClearAllNotifications(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := strings.TrimSpace(ps.ByName("userid"))
	if userID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	filter := bson.M{"userid": userID}
	if err := h.app.DB.DeleteMany(ctx, notificationsCollection, filter); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete notifications")
		return
	}

	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.AllNotificationsClearedEvent, mqevent.AllNotificationsClearedPayload{})

	utils.RespondWithJSON(w, http.StatusOK, map[string]any{
		"deleted": true,
	})
}
