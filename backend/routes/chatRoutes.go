package routes

import (
	"naevis/infra"
	"naevis/mechat"
	"naevis/middleware"
	"naevis/newchat"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// func AddDiscordRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
// 	// authmidware := middleware.Authenticate(app)

// }

func AddMeChatRoutes(router *httprouter.Router, hub *mechat.Hub, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/all", authmidware(mechat.GetUserChats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/start", authmidware(mechat.StartNewChat(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid", authmidware(mechat.GetChatByID(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid/messages", authmidware(mechat.GetChatMessages(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/chat/:chatid/message", authmidware(mechat.SendMessageREST(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/merechats/messages/:messageid", authmidware(mechat.EditMessage(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/merechats/messages/:messageid", authmidware(mechat.DeleteMessage(app)))

	router.HandlerFunc(http.MethodGet, "/ws/merechat", authmidware(
		mechat.HandleWebSocket(app, hub),
	))

	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/chat/:chatid/upload", authmidware(mechat.UploadAttachment(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid/search", authmidware(mechat.SearchMessages(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/messages/unread-count", authmidware(mechat.GetUnreadCount(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/messages/:messageid/read", authmidware(mechat.MarkAsRead(app)))
}

func AddNewChatRoutes(router *httprouter.Router, hub *newchat.Hub, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/newchats/all", authmidware(newchat.GetUserChats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchats/init", authmidware(newchat.InitChat(app)))

	// This should likely be protected; token could be in query or header
	router.HandlerFunc(http.MethodGet, "/ws/newchat/chat/:room", authmidware(newchat.WebSocketHandler(hub, app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/edit", authmidware(newchat.EditMessageHandler(hub, app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/delete", authmidware(newchat.DeleteMessageHandler(hub, app)))

	// router.HandlerFunc(http.MethodGet,"/newchat/:room/poll", authmidware(newchat.PollMessagesHandler))

	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/upload", authmidware(newchat.UploadHandler(hub, app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/newchat/chat/:room", authmidware(newchat.GetChat(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/chat/:room/message", authmidware(newchat.CreateMessage(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/newchat/chat/:room/message/:msgid", authmidware(newchat.DeletesMessage(app)))

	/**/

	router.HandlerFunc(http.MethodPut, "/api/v1/newchat/chat:room/message/:msgid", authmidware(newchat.UpdateMessage(app)))

}
