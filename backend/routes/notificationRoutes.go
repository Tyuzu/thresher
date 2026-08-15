package routes

import (
	"naevis/infra"
	"naevis/internal/beats/notifications"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// Notifications routes
func AddNotificationsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// Create notification
	router.HandlerFunc(http.MethodPost, "/api/v1/notifs", rateLimiter.Limit(authmidware(notifications.CreateNotification(app))))

	// Bulk create notifications
	router.HandlerFunc(http.MethodPost, "/api/v1/notifs/bulk", rateLimiter.Limit(authmidware(notifications.BulkCreateNotifications(app))))

	// Get user notifications
	router.HandlerFunc(http.MethodGet, "/api/v1/notifs", authmidware(notifications.GetUserNotifications(app)))

	// Get unread count
	router.HandlerFunc(http.MethodGet, "/api/v1/notifs/unread", authmidware(notifications.GetUnreadCount(app)))

	// Mark notification as read
	router.HandlerFunc(http.MethodPut, "/api/v1/notifs/notif/:notificationid/read", rateLimiter.Limit(authmidware(notifications.MarkAsRead(app))))

	// Mark all as read
	router.HandlerFunc(http.MethodPut, "/api/v1/notifs/read-all", rateLimiter.Limit(authmidware(notifications.MarkAllAsRead(app))))

	// Delete notification
	router.HandlerFunc(http.MethodDelete, "/api/v1/notifs/notif/:notificationid", rateLimiter.Limit(authmidware(notifications.DeleteNotification(app))))

	// Clear all notifications
	router.HandlerFunc(http.MethodDelete, "/api/v1/notifs", rateLimiter.Limit(authmidware(notifications.ClearAllNotifications(app))))

	// Notification preferences
	router.HandlerFunc(http.MethodGet, "/api/v1/notifs/preferences", authmidware(notifications.GetPreferences(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/notifs/preferences", rateLimiter.Limit(authmidware(notifications.UpdatePreferences(app))))
}
