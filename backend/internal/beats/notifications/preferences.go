package notifications

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra/mq"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GetPreferences retrieves user notification preferences (or defaults)
func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := strings.TrimSpace(ps.ByName("userid"))
	if userID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	filter := bson.M{"userId": userID}
	var preference NotificationPreference

	err := h.app.DB.FindOne(ctx, notificationsPreferencesCollection, filter, &preference)
	if err != nil {
		now := time.Now()
		preference = NotificationPreference{
			ID:              primitive.NewObjectID().Hex(),
			UserID:          userID,
			MentionsEnabled: true,
			FollowsEnabled:  true,
			CommentsEnabled: true,
			LikesEnabled:    true,
			MessagesEnabled: true,
			AllEnabled:      true,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	utils.RespondWithJSON(w, http.StatusOK, preference)
}

// UpdatePreferences updates user notification preferences (Fixed: Upsert logic)
func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := strings.TrimSpace(ps.ByName("userid"))
	if userID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var body UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	updates := bson.M{
		"updatedAt": time.Now(),
	}

	if body.AllEnabled != nil {
		val := *body.AllEnabled
		updates["allEnabled"] = val
		updates["mentionsEnabled"] = val
		updates["followsEnabled"] = val
		updates["commentsEnabled"] = val
		updates["likesEnabled"] = val
		updates["messagesEnabled"] = val
	} else {
		if body.MentionsEnabled != nil {
			updates["mentionsEnabled"] = *body.MentionsEnabled
		}
		if body.FollowsEnabled != nil {
			updates["followsEnabled"] = *body.FollowsEnabled
		}
		if body.CommentsEnabled != nil {
			updates["commentsEnabled"] = *body.CommentsEnabled
		}
		if body.LikesEnabled != nil {
			updates["likesEnabled"] = *body.LikesEnabled
		}
		if body.MessagesEnabled != nil {
			updates["messagesEnabled"] = *body.MessagesEnabled
		}
	}

	filter := bson.M{"userId": userID}
	update := bson.M{
		"$set": updates,
		"$setOnInsert": bson.M{
			"_id":       primitive.NewObjectID().Hex(),
			"userId":    userID,
			"createdAt": time.Now(),
		},
	}

	// Use UpsertOne to create preferences if missing for the user
	if _, err := h.app.DB.UpdateOne(ctx, notificationsPreferencesCollection, filter, update); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update preferences")
		return
	}

	_ = mq.PublishWithMeta(ctx, h.app.MQ, mqevent.NotificationPreferencesUpdatedEvent, mqevent.NotificationPreferencesUpdatedPayload{})

	var updated NotificationPreference
	if err := h.app.DB.FindOne(ctx, notificationsPreferencesCollection, filter, &updated); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve updated preferences")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, updated)
}
