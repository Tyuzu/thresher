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

	"naevis/artists/repo"
	aust "naevis/artists/usecase"

	"go.mongodb.org/mongo-driver/bson"
)

func (p *songPayload) ValidateRequired() error {
	if p.Title == nil || *p.Title == "" ||
		p.Genre == nil || *p.Genre == "" ||
		p.Duration == nil || *p.Duration == "" {
		return errors.New("missing required fields: title, genre, duration")
	}
	return nil
}

func (p *songPayload) ToBSONUpdate() bson.M {
	update := bson.M{}

	assignIfPresent := func(field string, val *string) {
		if val != nil {
			update[field] = *val
		}
	}

	assignIfPresent("title", p.Title)
	assignIfPresent("genre", p.Genre)
	assignIfPresent("duration", p.Duration)
	assignIfPresent("description", p.Description)
	assignIfPresent("audioUrl", p.Audio)
	assignIfPresent("poster", p.Poster)
	assignIfPresent("audioextn", p.AudioExtn)
	assignIfPresent("posterextn", p.PosterExtn)

	return update
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
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

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
		rndmstr, _ := utils.GenerateRandomString(12)
		newSong := models.ArtistSong{
			SongID:      rndmstr,
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

		if err := uc.PostSong(ctx, &newSong); err != nil {
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
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

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

		updateFields := payload.ToBSONUpdate()
		if len(updateFields) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "No fields to update")
			return
		}

		updateFields["updatedAt"] = time.Now()
		update := bson.M{"$set": updateFields}

		if err := uc.EditSong(ctx, artistID, songID, update); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update song")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongUpdatedEvent, mqevent.SongUpdatedPayload{
			SongID:   songID,
			ArtistID: artistID,
		})

		utils.RespondWithJSON(w, http.StatusOK, bson.M{"message": "Song updated successfully"})
	}
}

func DeleteSong(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistID := utils.GetParam(r, "id")
		songID := utils.GetParam(r, "songId")

		if songID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "songId is required")
			return
		}

		if err := uc.DeleteSong(ctx, artistID, songID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete song")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SongDeletedEvent, mqevent.SongDeletedPayload{
			SongID:   songID,
			ArtistID: artistID,
		})

		utils.RespondWithJSON(w, http.StatusOK, bson.M{"message": "Song deleted successfully"})
	}
}
