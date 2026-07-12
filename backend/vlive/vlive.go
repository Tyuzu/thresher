package vlive

import (
	"context"
	"encoding/json"
	"errors"
	log "naevis/utils/logger"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ----------------------- COMMON HELPERS -----------------------

// fetchStream fetches a stream by hex ID, optionally enforcing ownership
func fetchStream(ctx context.Context, app *infra.Deps, idHex, userID string, requireOwner bool) (models.LiveStream, error) {
	id, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		return models.LiveStream{}, errors.New("invalid liveid")
	}

	stream, err := getStreamByID(ctx, app, id)
	if err != nil {
		return models.LiveStream{}, errors.New("stream not found")
	}

	if requireOwner && !isOwner(userID, stream) {
		return models.LiveStream{}, errors.New("forbidden")
	}

	return stream, nil
}

// validate metadata for updates
func validateMetadata(payload map[string]interface{}) (bson.M, error) {
	update := bson.M{}

	if title, ok := payload["title"].(string); ok {
		title = strings.TrimSpace(title)
		if title == "" {
			return nil, errors.New("title cannot be empty")
		}
		update["title"] = title
	}

	if desc, ok := payload["description"].(string); ok {
		update["description"] = desc
	}

	if thumb, ok := payload["thumbnail"].(string); ok {
		update["thumbnail"] = thumb
	}

	if tags, ok := payload["tags"].([]interface{}); ok {
		clean := []string{}
		for _, t := range tags {
			if s, ok := t.(string); ok {
				clean = append(clean, s)
			}
		}
		update["tags"] = clean
	}

	if slow, ok := payload["slowModeSeconds"].(float64); ok {
		if slow < 0 || slow > 3600 {
			return nil, errors.New("slowModeSeconds must be between 0 and 3600")
		}
		update["slow_mode_seconds"] = int(slow)
	}

	return update, nil
}

// ----------------------- STATE MACHINE -----------------------

var validTransitions = map[string][]string{
	models.LiveCreated:   {models.LiveReady, models.LiveCancelled},
	models.LiveReady:     {models.LiveLive, models.LiveCancelled},
	models.LiveLive:      {models.LiveEnded, models.LiveError},
	models.LiveError:     {models.LiveEnded, models.LiveCancelled},
	models.LiveCancelled: {}, // terminal
	models.LiveEnded:     {}, // terminal
}

func CanTransition(from, to string) bool {
	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}
	for _, v := range allowed {
		if v == to {
			return true
		}
	}
	return false
}

func EnforceTransition(from, to string) error {
	if !CanTransition(from, to) {
		return errors.New("invalid livestream state transition")
	}
	return nil
}

// ----------------------- STREAM HANDLERS -----------------------

func CreateStream(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}

		var payload struct {
			EntityType      string   `json:"entityType"`
			EntityID        string   `json:"entityId"`
			Title           string   `json:"title"`
			Description     *string  `json:"description"`
			IsPublic        *bool    `json:"isPublic"`
			Thumbnail       *string  `json:"thumbnail"`
			Tags            []string `json:"tags"`
			SlowModeSeconds *int     `json:"slowModeSeconds"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid body")
			return
		}

		if strings.TrimSpace(payload.Title) == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "title is required")
			return
		}
		if !validateEntityType(payload.EntityType) {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid entityType")
			return
		}
		if payload.EntityID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "entityId required")
			return
		}

		// 🔒 entity access check (creator must own or be member)
		if !CheckEntityAccess(
			r.Context(),
			app,
			userID,
			payload.EntityType,
			payload.EntityID,
		) {
			utils.RespondWithError(w, http.StatusForbidden, "forbidden")
			return
		}

		activeFilter := bson.M{
			"creator_id": userID,
			"state": bson.M{
				"$in": []string{
					models.LiveCreated,
					models.LiveReady,
					models.LiveLive,
				},
			},
		}

		count, err := app.DB.CountDocuments(r.Context(), vlivesCollection, activeFilter)
		if err != nil {
			log.Printf("CreateStream: count error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "db error")
			return
		}
		if count > 0 {
			utils.RespondWithError(w, http.StatusConflict, "creator already has an active livestream")
			return
		}

		isPublic := false
		if payload.IsPublic != nil {
			isPublic = *payload.IsPublic
		}

		stream := models.LiveStream{
			LiveID:          utils.GenerateRandomDigitString(14),
			EntityType:      payload.EntityType,
			EntityID:        payload.EntityID,
			CreatorID:       userID,
			Title:           payload.Title,
			Description:     "",
			Thumbnail:       "",
			Tags:            []string{},
			State:           models.LiveCreated,
			IsPublic:        isPublic,
			StreamKey:       utils.GenerateRandomDigitString(32),
			IngestURL:       app.Config.RTMPIngestURL,
			CreatedAt:       time.Now(),
			ChatEnabled:     true,
			VODPublished:    false,
			Unlisted:        false,
			SlowModeSeconds: 0,
		}

		if payload.Description != nil {
			stream.Description = *payload.Description
		}
		if payload.Thumbnail != nil {
			stream.Thumbnail = *payload.Thumbnail
		}
		if payload.Tags != nil {
			stream.Tags = payload.Tags
		}
		if payload.SlowModeSeconds != nil {
			stream.SlowModeSeconds = *payload.SlowModeSeconds
		}

		if err := app.DB.Insert(r.Context(), vlivesCollection, stream); err != nil {
			log.Printf("CreateStream: insert failed: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "insert failed")
			return
		}

		resp := bson.M{
			"liveid":          stream.LiveID,
			"entityType":      stream.EntityType,
			"entityId":        stream.EntityID,
			"title":           stream.Title,
			"description":     stream.Description,
			"thumbnail":       stream.Thumbnail,
			"tags":            stream.Tags,
			"state":           stream.State,
			"isPublic":        stream.IsPublic,
			"ingestUrl":       stream.IngestURL,
			"createdAt":       stream.CreatedAt,
			"slowModeSeconds": stream.SlowModeSeconds,
			"streamKey":       stream.StreamKey, // exposed only here
		}

		log.Printf("CreateStream: user=%s created liveID=%s", userID, stream.LiveID)

		mqpayload, _ := json.Marshal(mqevent.StreamCreatedPayload{})
		app.MQ.Publish(ctx, mqevent.StreamCreatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, resp)
	}
}

// ----------------------- MARK READY -----------------------

func MarkReady(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}

		stream, err := fetchStream(r.Context(), app, ps.ByName("liveid"), userID, true)
		if err != nil {
			utils.RespondWithError(w, http.StatusForbidden, err.Error())
			return
		}

		if err := EnforceTransition(stream.State, models.LiveReady); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		ok, err := conditionalStateUpdate(r.Context(), app, stream.LiveID, models.LiveCreated,
			bson.M{"state": models.LiveReady, "ready_at": time.Now()})
		if err != nil {
			log.Printf("MarkReady: update error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "db error")
			return
		}
		if !ok {
			utils.RespondWithError(w, http.StatusConflict, "state transition failed")
			return
		}

		log.Printf("MarkReady: liveID=%s user=%s", stream.LiveID, userID)
		w.WriteHeader(http.StatusNoContent)
	}
}

// ----------------------- SET PRIVACY -----------------------

func SetPrivacy(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}

		stream, err := fetchStream(r.Context(), app, ps.ByName("liveid"), userID, true)
		if err != nil {
			utils.RespondWithError(w, http.StatusForbidden, err.Error())
			return
		}

		var payload struct {
			Mode string `json:"mode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid body")
			return
		}

		update := bson.M{}
		switch strings.ToUpper(payload.Mode) {
		case "PUBLIC":
			update["is_public"] = true
			update["unlisted"] = false
		case "UNLISTED":
			update["is_public"] = false
			update["unlisted"] = true
		case "PRIVATE":
			update["is_public"] = false
			update["unlisted"] = false
		default:
			utils.RespondWithError(w, http.StatusBadRequest, "invalid mode")
			return
		}

		update["updated_at"] = time.Now()

		err = app.DB.UpdateOne(
			r.Context(),
			vlivesCollection,
			bson.M{"liveid": stream.LiveID},
			bson.M{"$set": update},
		)
		if err != nil {
			log.Printf("SetPrivacy: update failed: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "db error")
			return
		}

		log.Printf(
			"SetPrivacy: liveID=%s set mode=%s by user=%s",
			stream.LiveID,
			payload.Mode,
			userID,
		)
		w.WriteHeader(http.StatusNoContent)
	}
}

// ----------------------- VIEWER COUNT -----------------------

func GetViewerCount(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		liveID := ps.ByName("liveid")
		if liveID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid liveid")
			return
		}
		count := getViewerCountCache(r.Context(), app, liveID)
		utils.RespondWithJSON(w, http.StatusOK, bson.M{"count": count})
	}
}

// ----------------------- TURN SERVERS -----------------------

func GetTURNServers(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		utils.RespondWithJSON(w, http.StatusOK, app.Config.TURNServers)
	}
}
