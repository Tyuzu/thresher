package vlive

import (
	"encoding/json"
	"log"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ----------------------- VOD / INGEST -----------------------

func StartIngest(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		streamKey := r.URL.Query().Get("key")
		if streamKey == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "missing key")
			return
		}

		stream, err := getStreamByKey(r.Context(), app, streamKey)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "invalid stream key")
			return
		}

		allowedFrom := map[string]bool{
			models.LiveReady:   true,
			models.LiveCreated: true,
		}
		if !allowedFrom[stream.State] {
			utils.RespondWithError(w, http.StatusConflict, "stream not ready for ingest")
			return
		}

		playback := strings.TrimRight(app.Config.CDNBaseURL, "/") +
			"/live/" + stream.LiveID + ".m3u8"

		ok, err := conditionalStateUpdate(
			r.Context(),
			app,
			stream.LiveID,
			stream.State,
			bson.M{
				"state":        models.LiveLive,
				"started_at":   time.Now(),
				"playback_url": playback,
			},
		)
		if err != nil || !ok {
			log.Printf("StartIngest: transition error: %v ok=%v", err, ok)
			utils.RespondWithError(w, http.StatusInternalServerError, "failed to start ingest")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)
		utils.RespondWithJSON(w, http.StatusOK, bson.M{"status": "ok", "playbackUrl": playback})
	}
}

func RecordingComplete(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		streamKey := r.URL.Query().Get("key")
		file := r.URL.Query().Get("path")
		if streamKey == "" || file == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "missing key or path")
			return
		}

		stream, err := getStreamByKey(r.Context(), app, streamKey)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "invalid stream key")
			return
		}

		vodURL := strings.TrimRight(app.Config.CDNBaseURL, "/") +
			"/vod/" + filepath.Base(file)

		err = app.DB.UpdateOne(
			r.Context(),
			vlivesCollection,
			bson.M{"liveid": stream.LiveID},
			bson.M{
				"$set": bson.M{
					"recording_path": file,
					"vod_url":        vodURL,
					"state":          models.LiveEnded,
					"ended_at":       time.Now(),
				},
			},
		)
		if err != nil {
			log.Printf("RecordingComplete: update error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "db error")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, bson.M{"vodUrl": vodURL})
	}
}

func PublishVOD(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		id, err := primitive.ObjectIDFromHex(ps.ByName("liveid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid liveid")
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}

		stream, err := getStreamByID(r.Context(), app, id)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "stream not found")
			return
		}

		if !isOwner(userID, stream) {
			utils.RespondWithError(w, http.StatusForbidden, "forbidden")
			return
		}

		if stream.VODURL == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "no vod available")
			return
		}

		err = app.DB.UpdateOne(
			r.Context(),
			vlivesCollection,
			bson.M{"_id": id},
			bson.M{"$set": bson.M{"vod_published": true}},
		)
		if err != nil {
			log.Printf("PublishVOD: update error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "db error")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func DeleteVOD(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		id, err := primitive.ObjectIDFromHex(ps.ByName("liveid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid liveid")
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthenticated")
			return
		}

		stream, err := getStreamByID(r.Context(), app, id)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "stream not found")
			return
		}

		if !isOwner(userID, stream) {
			utils.RespondWithError(w, http.StatusForbidden, "forbidden")
			return
		}

		err = app.DB.UpdateOne(
			r.Context(),
			vlivesCollection,
			bson.M{"_id": id},
			bson.M{
				"$unset": bson.M{
					"vod_url":        "",
					"recording_path": "",
				},
				"$set": bson.M{
					"vod_published": false,
				},
			},
		)
		if err != nil {
			log.Printf("DeleteVOD: update error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "db error")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func GetVOD(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		id, err := primitive.ObjectIDFromHex(ps.ByName("liveid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid id")
			return
		}

		userID := utils.GetUserIDFromRequest(r)

		stream, err := getStreamByID(r.Context(), app, id)
		if err != nil || stream.VODURL == "" {
			utils.RespondWithError(w, http.StatusNotFound, "not found")
			return
		}

		if !stream.IsPublic && stream.CreatorID != userID {
			if !CheckEntityAccess(
				r.Context(),
				app,
				userID,
				stream.EntityType,
				stream.EntityID,
			) {
				utils.RespondWithError(w, http.StatusForbidden, "forbidden")
				return
			}
		}

		if !stream.VODPublished && stream.CreatorID != userID {
			utils.RespondWithError(w, http.StatusNotFound, "vod not published")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, bson.M{"vodUrl": stream.VODURL})
	}
}
