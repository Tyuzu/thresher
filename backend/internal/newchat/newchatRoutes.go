package newchat

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the newchat package.

func AddNewChatRoutes(router *httprouter.Router, hub *Hub, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/newchats/all", authmidware(GetUserChats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchats/init", authmidware(InitChat(app)))

	// This should likely be protected; token could be in query or header
	router.HandlerFunc(http.MethodGet, "/ws/newchat/chat/:room", authmidware(WebSocketHandler(hub, app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/edit", authmidware(EditMessageHandler(hub, app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/delete", authmidware(DeleteMessageHandler(hub, app)))

	// router.HandlerFunc(http.MethodGet,"/newchat/:room/poll", authmidware(PollMessagesHandler))

	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/upload", authmidware(UploadHandler(hub, app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/newchat/chat/:room", authmidware(GetChat(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/chat/:room/message", authmidware(CreateMessage(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/newchat/chat/:room/message/:msgid", authmidware(DeletesMessage(app)))

	/**/

	router.HandlerFunc(http.MethodPut, "/api/v1/newchat/chat:room/message/:msgid", authmidware(UpdateMessage(app)))

}
