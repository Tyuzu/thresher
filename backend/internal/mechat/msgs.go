package mechat

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"
	log "naevis/utils/logger"
)

//
// ================= HELPERS =================
//

func getUser(r *http.Request) string {
	return utils.GetUserIDFromRequest(r)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	http.Error(w, msg, code)
}

func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

//
// ================= MESSAGES (HANDLERS) =================
//

// SendMessageREST handles REST message creation
func SendMessageREST(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := getUser(r)
		chatID := utils.GetParam(r, "chatid")

		if user == "" {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		if err := dbEnsureChatAccess(ctx, app, chatID, user); err != nil {
			writeErr(w, http.StatusNotFound, "not found or access denied")
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

		var body struct {
			Content  string `json:"content"`
			ClientID string `json:"clientId,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid body")
			return
		}

		body.Content = strings.TrimSpace(body.Content)
		if body.Content == "" {
			writeErr(w, http.StatusBadRequest, "content required")
			return
		}

		msg := &Message{
			MessageID: utils.GenerateRandomDigitString(16),
			ChatID:    chatID,
			UserID:    user,
			Content:   body.Content,
			CreatedAt: time.Now(),
			ReadBy:    []string{user},
			Status:    "sent",
		}

		if err := dbInsertMessage(ctx, app, msg); err != nil {
			log.L.Sugar().Errorw("Failed to insert message", "error", err)
			writeErr(w, http.StatusInternalServerError, "failed to persist message")
			return
		}

		dbUpdateLastMessage(ctx, app, chatID, msg)

		resp := struct {
			*Message
			ClientID string `json:"clientId,omitempty"`
		}{msg, body.ClientID}

		mqpayload, _ := json.Marshal(mqevent.ChatMessageSentPayload{
			MessageID: msg.MessageID,
			MechatID:  chatID,
			UserID:    user,
		})

		if err := app.MQ.Publish(ctx, mqevent.ChatMessageSentEvent, mqpayload); err != nil {
			log.L.Sugar().Warnw("Failed to publish chat message sent event", "error", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, resp)
	}
}

// EditMessage allows message owners to update message content
func EditMessage(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := getUser(r)
		id := utils.GetParam(r, "messageid")

		r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid body")
			return
		}

		body.Content = strings.TrimSpace(body.Content)
		if body.Content == "" {
			writeErr(w, http.StatusBadRequest, "content required")
			return
		}

		msg, err := dbEditMessage(ctx, app, id, user, body.Content)
		if err != nil {
			writeErr(w, http.StatusForbidden, "forbidden or not found")
			return
		}

		dbUpdateLastMessage(ctx, app, msg.ChatID, msg)
		w.WriteHeader(http.StatusNoContent)
	}
}

// DeleteMessage soft deletes a message
func DeleteMessage(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := getUser(r)

		msgID := utils.GetParam(r, "messageid")
		if msgID == "" {
			writeErr(w, http.StatusBadRequest, "invalid message id")
			return
		}

		if _, err := dbDeleteMessage(ctx, app, msgID, user); err != nil {
			writeErr(w, http.StatusForbidden, "forbidden or not found")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

//
// ================= READ STATUS (HANDLERS) =================
//

// MarkAsRead marks a message as read by the current user
func MarkAsRead(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := getUser(r)
		id := utils.GetParam(r, "messageid")

		if err := dbMarkAsRead(ctx, app, id, user); err != nil {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// GetUnreadCount aggregates unread counts per chat using MongoDB aggregation pipeline
func GetUnreadCount(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := getUser(r)

		chats, countsMap, err := dbGetUnreadCountsPerChat(ctx, app, user)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "failed to load chats")
			return
		}

		type resp struct {
			ChatID string `json:"chatid"`
			Count  int64  `json:"count"`
		}

		out := make([]resp, 0, len(chats))
		for _, c := range chats {
			out = append(out, resp{
				ChatID: c.ChatID,
				Count:  countsMap[c.ChatID],
			})
		}

		utils.RespondWithJSON(w, http.StatusOK, out)
	}
}

// SearchMessages performs regex or index search for messages in a chat
func SearchMessages(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := getUser(r)
		chatID := utils.GetParam(r, "chatid")

		if err := dbEnsureChatAccess(ctx, app, chatID, user); err != nil {
			writeErr(w, http.StatusNotFound, "not found or access denied")
			return
		}

		term := strings.TrimSpace(r.URL.Query().Get("term"))

		limit := 50
		if l := r.URL.Query().Get("limit"); l != "" {
			if v, err := parseInt(l); err == nil && v > 0 {
				limit = v
			}
		}
		if limit > 100 { // Max limit guardrail
			limit = 100
		}

		skip := 0
		if s := r.URL.Query().Get("skip"); s != "" {
			if v, err := parseInt(s); err == nil && v >= 0 {
				skip = v
			}
		}

		msgs, err := dbSearchMessages(ctx, app, chatID, term, limit, skip)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "internal error")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, msgs)
	}
}
