package notifications

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the notifications package.

// Notifications routes
func AddNotificationsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// Create notification
	// router.HandlerFunc(http.MethodPost, "/api/v1/notifs", rateLimiter.Limit(authmidware(CreateNotification(app))))

	// Bulk create notifications
	// router.HandlerFunc(http.MethodPost, "/api/v1/notifs/bulk", rateLimiter.Limit(authmidware(BulkCreateNotifications(app))))

	// Get user notifications
	router.HandlerFunc(http.MethodGet, "/api/v1/notifs", authmidware(GetUserNotifications(app)))

	// Get unread count
	router.HandlerFunc(http.MethodGet, "/api/v1/notifs/unread", authmidware(GetUnreadCount(app)))

	// Mark notification as read
	router.HandlerFunc(http.MethodPut, "/api/v1/notifs/notif/:notificationid/read", rateLimiter.Limit(authmidware(MarkAsRead(app))))

	// Mark all as read
	router.HandlerFunc(http.MethodPut, "/api/v1/notifs/read-all", rateLimiter.Limit(authmidware(MarkAllAsRead(app))))

	// Delete notification
	router.HandlerFunc(http.MethodDelete, "/api/v1/notifs/notif/:notificationid", rateLimiter.Limit(authmidware(DeleteNotification(app))))

	// Clear all notifications
	router.HandlerFunc(http.MethodDelete, "/api/v1/notifs", rateLimiter.Limit(authmidware(ClearAllNotifications(app))))

	// Notification preferences
	router.HandlerFunc(http.MethodGet, "/api/v1/notifs/preferences", authmidware(GetPreferences(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/notifs/preferences", rateLimiter.Limit(authmidware(UpdatePreferences(app))))
}
