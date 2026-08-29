package mechat

import (
	"context"
	"net/http"
	"sync"
	"time"

	"scav/infra"
	"scav/middleware"
	"scav/utils"
	log "scav/utils/logger"

	"github.com/gorilla/websocket"
)

const (
	writeTimeout = 10 * time.Second
	pongWait     = 60 * time.Second
	pingPeriod   = (pongWait * 9) / 10
	queueSize    = 256
)

//
// ================= HUB =================
//

type Client struct {
	UserID    string
	Conn      *websocket.Conn
	Send      chan any
	closeOnce sync.Once
}

func (c *Client) Close() {
	c.closeOnce.Do(func() {
		close(c.Send)
		_ = c.Conn.Close()
	})
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]*Client),
	}
}

func (h *Hub) Run() {
	// Background processing loop if pub/sub expansion is added
}

func (h *Hub) Stop() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for uid, client := range h.clients {
		client.Close()
		delete(h.clients, uid)
	}
}

func (h *Hub) Add(c *Client) {
	h.mu.Lock()
	// Disconnect existing active connection for the user if present
	if existing, ok := h.clients[c.UserID]; ok {
		existing.Close()
	}
	h.clients[c.UserID] = c
	h.mu.Unlock()
}

func (h *Hub) Remove(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if current, ok := h.clients[c.UserID]; ok && current == c {
		delete(h.clients, c.UserID)
		c.Close()
	}
}

//
// ================= WS SETUP =================
//

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Validated against trusted origins in production middleware
		return true
	},
}

func HandleWebSocket(app *infra.Deps, hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		raw := r.URL.Query().Get("token")
		if raw == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		claims, err := middleware.ParseToken(raw)
		if err != nil || claims.UserID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.L.Sugar().Errorw("Upgrade failed", "error", err)
			return
		}

		client := &Client{
			UserID: claims.UserID,
			Conn:   conn,
			Send:   make(chan any, queueSize),
		}

		hub.Add(client)

		// Synchronize lifecycle cleanup
		go wsWriter(client)
		wsReader(r.Context(), client, app, hub)

		// Cleanup when wsReader exits
		hub.Remove(client)
	}
}

//
// ================= LOOPS =================
//

func wsWriter(c *Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeTimeout))
			if !ok {
				// Hub closed the channel
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteJSON(msg); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeTimeout))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func wsReader(ctx context.Context, c *Client, app *infra.Deps, hub *Hub) {
	defer func() {
		_ = c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512 * 1024) // 512KB message limit
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		var in IncomingWSMessage
		if err := c.Conn.ReadJSON(&in); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.L.Sugar().Warnw("WebSocket error", "userID", c.UserID, "error", err)
			}
			break
		}

		switch in.Type {
		case "message":
			wsSendMessage(ctx, c, in, app, hub)
		case "edit":
			wsEditMessage(ctx, c, in, app, hub)
		case "delete":
			wsDeleteMessage(ctx, c, in, app, hub)
		case "read":
			wsReadMessage(ctx, c, in, app, hub)
		case "reaction:add":
			wsReaction(ctx, c, in, app, hub, true)
		case "reaction:remove":
			wsReaction(ctx, c, in, app, hub, false)
		}
	}
}

//
// ================= ACTIONS =================
//

func wsSendMessage(ctx context.Context, c *Client, in IncomingWSMessage, app *infra.Deps, hub *Hub) {
	if dbEnsureChatAccess(ctx, app, in.ChatID, c.UserID) != nil {
		return
	}

	msg := &Message{
		MessageID: utils.GenerateRandomDigitString(16),
		ChatID:    in.ChatID,
		UserID:    c.UserID,
		Content:   in.Content,
		CreatedAt: time.Now(),
		ReadBy:    []string{c.UserID},
		Status:    "sent",
	}

	if err := dbInsertMessage(ctx, app, msg); err != nil {
		log.L.Sugar().Errorw("Insert message failed", "error", err)
		return
	}

	dbUpdateLastMessage(ctx, app, in.ChatID, msg)

	broadcastToChat(ctx, app, hub, in.ChatID, map[string]any{
		"type":      "message",
		"messageid": msg.MessageID,
		"chatid":    msg.ChatID,
		"sender":    msg.UserID,
		"content":   msg.Content,
		"createdAt": msg.CreatedAt,
		"status":    "sent",
		"clientId":  in.ClientID,
	})
}

func wsEditMessage(ctx context.Context, c *Client, in IncomingWSMessage, app *infra.Deps, hub *Hub) {
	if in.MessageID == "" || in.Content == "" {
		return
	}

	msg, err := dbEditMessage(ctx, app, in.MessageID, c.UserID, in.Content)
	if err != nil {
		return
	}

	broadcastToChat(ctx, app, hub, msg.ChatID, map[string]any{
		"type":    "edit",
		"message": msg,
	})
}

func wsDeleteMessage(ctx context.Context, c *Client, in IncomingWSMessage, app *infra.Deps, hub *Hub) {
	msgID := in.MessageID
	if msgID == "" {
		msgID = in.Content
	}
	if msgID == "" {
		return
	}

	msg, err := dbDeleteMessage(ctx, app, msgID, c.UserID)
	if err != nil {
		return
	}

	broadcastToChat(ctx, app, hub, msg.ChatID, map[string]any{
		"type":      "delete",
		"messageId": msg.MessageID,
	})
}

func wsReadMessage(ctx context.Context, c *Client, in IncomingWSMessage, app *infra.Deps, hub *Hub) {
	msgID := in.MessageID
	if msgID == "" {
		msgID = in.Content
	}
	if msgID == "" {
		return
	}

	if err := dbMarkAsRead(ctx, app, msgID, c.UserID); err != nil {
		return
	}

	broadcastToChat(ctx, app, hub, in.ChatID, map[string]any{
		"type":      "read",
		"messageId": msgID,
		"user":      c.UserID,
	})
}

func wsReaction(ctx context.Context, c *Client, in IncomingWSMessage, app *infra.Deps, hub *Hub, add bool) {
	msgID := in.MessageID
	if msgID == "" {
		msgID = in.Content
	}
	if msgID == "" {
		return
	}

	if err := dbUpdateReaction(ctx, app, msgID, c.UserID, add); err != nil {
		return
	}

	broadcastToChat(ctx, app, hub, in.ChatID, map[string]any{
		"type":      "reaction",
		"messageId": msgID,
		"user":      c.UserID,
		"add":       add,
	})
}

//
// ================= BROADCAST =================
//

func broadcastToChat(ctx context.Context, app *infra.Deps, hub *Hub, chatID string, payload any) {
	participants, err := dbGetChatParticipants(ctx, app, chatID)
	if err != nil {
		return
	}

	hub.mu.RLock()
	defer hub.mu.RUnlock()

	for _, uid := range participants {
		if c, ok := hub.clients[uid]; ok {
			select {
			case c.Send <- payload:
			default:
				log.L.Sugar().Warnw("WS send queue full, dropping message", "userID", uid)
			}
		}
	}
}
