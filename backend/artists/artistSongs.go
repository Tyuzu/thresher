package artists

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
)

func (p *songPayload) ValidateRequired() error {
	if p.Title == nil || *p.Title == "" ||
		p.Genre == nil || *p.Genre == "" ||
		p.Duration == nil || *p.Duration == "" {
		return errors.New("missing required fields: title, genre, duration")
	}
	return nil
}

// Helper to decode JSON requests consistently across handlers
func decodeJSONBody[T any](r *http.Request, target *T) error {
	defer r.Body.Close()
	err := json.NewDecoder(r.Body).Decode(target)
	if errors.Is(err, io.EOF) {
		return errors.New("request body cannot be empty")
	}
	return err
}

func PostNewSong(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistID := utils.GetParam(r, "id")

		var payload songPayload
		if err := decodeJSONBody(r, &payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		if err := payload.ValidateRequired(); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		deref := func(s *string) string {
			if s == nil {
				return ""
			}
			return *s
		}

		newSong := models.ArtistSong{
			SongID:      utils.GenerateRandomString(12),
			ArtistID:    artistID,
			Title:       deref(payload.Title),
			Genre:       deref(payload.Genre),
			Duration:    deref(payload.Duration),
			Description: deref(payload.Description),
			AudioURL:    deref(payload.Audio),
			Poster:      deref(payload.Poster),
			Published:   true,
			Plays:       0,
			UploadedAt:  time.Now(),
			AudioExtn:   deref(payload.AudioExtn),
			PosterExtn:  deref(payload.PosterExtn),
		}

		if err := InsertArtistSong(ctx, app.DB, &newSong); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to save song")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongCreatedEvent, mqevent.SongCreatedPayload{
			SongID:   newSong.SongID,
			ArtistID: artistID,
		})

		utils.RespondWithJSON(w, http.StatusCreated, newSong)
	}
}

func EditSong(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistID := utils.GetParam(r, "id")
		songID := utils.GetParam(r, "songId")

		if songID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "songId is required")
			return
		}

		var payload songPayload
		if err := decodeJSONBody(r, &payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		// Delegated BSON mapping and persistence to the repo function
		_, err := UpdateArtistSongFromPayload(ctx, app.DB, artistID, songID, payload)
		if err != nil {
			if errors.Is(err, ErrNoFieldsToUpdate) {
				utils.RespondWithError(w, http.StatusBadRequest, "No fields to update")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update song")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongUpdatedEvent, mqevent.SongUpdatedPayload{
			SongID:   songID,
			ArtistID: artistID,
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Song updated successfully",
		})
	}
}

func DeleteSong(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistID := utils.GetParam(r, "id")
		songID := utils.GetParam(r, "songId")

		if songID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "songId is required")
			return
		}

		if err := DeleteArtistSong(ctx, app.DB, artistID, songID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete song")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongDeletedEvent, mqevent.SongDeletedPayload{
			SongID:   songID,
			ArtistID: artistID,
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Song deleted successfully",
		})
	}
}
