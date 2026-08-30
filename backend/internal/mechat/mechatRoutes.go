package mechat

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the mechat package.

func AddMeChatRoutes(router *httprouter.Router, hub *Hub, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/all", authmidware(GetUserChats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/start", authmidware(StartNewChat(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid", authmidware(GetChatByID(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid/messages", authmidware(GetChatMessages(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/chat/:chatid/message", authmidware(SendMessageREST(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/merechats/messages/:messageid", authmidware(EditMessage(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/merechats/messages/:messageid", authmidware(DeleteMessage(app)))

	router.HandlerFunc(http.MethodGet, "/ws/merechat", authmidware(
		HandleWebSocket(app, hub),
	))

	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/chat/:chatid/upload", authmidware(UploadAttachment(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid/search", authmidware(SearchMessages(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/messages/unread-count", authmidware(GetUnreadCount(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/messages/:messageid/read", authmidware(MarkAsRead(app)))
}
