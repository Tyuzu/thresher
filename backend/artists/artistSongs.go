package artists

import (
	"encoding/json"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func PostNewSong(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		artistID := ps.ByName("id")

		var payload struct {
			Title       string `json:"title"`
			Genre       string `json:"genre"`
			Duration    string `json:"duration"`
			Description string `json:"description"`
			Audio       string `json:"audio"`
			Poster      string `json:"poster"`
			AudioExtn   string `json:"audioextn"`
			PosterExtn  string `json:"posterextn"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		if payload.Title == "" || payload.Genre == "" || payload.Duration == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing required fields: title, genre, duration")
			return
		}

		newSong := models.ArtistSong{
			SongID:      utils.GenerateRandomString(12),
			ArtistID:    artistID,
			Title:       payload.Title,
			Genre:       payload.Genre,
			Duration:    payload.Duration,
			Description: payload.Description,
			AudioURL:    payload.Audio,
			Poster:      payload.Poster,
			Published:   true,
			Plays:       0,
			UploadedAt:  time.Now(),
			AudioExtn:   payload.AudioExtn,
			PosterExtn:  payload.PosterExtn,
		}

		if err := InsertArtistSong(ctx, app.DB, &newSong); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to save song")
			return
		}

		/* -------- Publish SongCreated Event -------- */

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongCreatedEvent, mqevent.SongCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, newSong)
	}
}
func EditSong(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		artistID := ps.ByName("id")
		songID := ps.ByName("songId")

		if songID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "songId is required")
			return
		}

		var payload struct {
			Title       string `json:"title"`
			Genre       string `json:"genre"`
			Duration    string `json:"duration"`
			Description string `json:"description"`
			Audio       string `json:"audio"`
			Poster      string `json:"poster"`
			AudioExtn   string `json:"audioextn"`
			PosterExtn  string `json:"posterextn"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		updateFields := bson.M{}
		if payload.Title != "" {
			updateFields["title"] = payload.Title
		}
		if payload.Genre != "" {
			updateFields["genre"] = payload.Genre
		}
		if payload.Duration != "" {
			updateFields["duration"] = payload.Duration
		}
		if payload.Description != "" {
			updateFields["description"] = payload.Description
		}
		if payload.Audio != "" {
			updateFields["audioUrl"] = payload.Audio
		}
		if payload.AudioExtn != "" {
			updateFields["audioextn"] = payload.AudioExtn
		}
		if payload.Poster != "" {
			updateFields["poster"] = payload.Poster
		}
		if payload.PosterExtn != "" {
			updateFields["posterextn"] = payload.PosterExtn
		}

		if len(updateFields) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "No fields to update")
			return
		}

		updateFields["updatedAt"] = time.Now()

		update := bson.M{"$set": updateFields}

		err := UpdateArtistSong(ctx, app.DB, artistID, songID, update)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update song")
			return
		}

		/* -------- Publish SongUpdated Event -------- */
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongUpdatedEvent, mqevent.SongUpdatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, bson.M{"message": "Song updated successfully"})
	}
}
func DeleteSong(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		artistID := ps.ByName("id")
		songID := ps.ByName("songId")

		if songID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "songId is required")
			return
		}

		err := DeleteArtistSong(ctx, app.DB, artistID, songID)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete song")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongDeletedEvent, mqevent.SongDeletedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, bson.M{"message": "Song deleted successfully"})
	}
}
