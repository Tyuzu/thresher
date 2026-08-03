package artists

import (
	"encoding/json"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"strings"

	"naevis/artists/repo"
	aust "naevis/artists/usecase"

	"go.mongodb.org/mongo-driver/bson"
)

func AddArtistMember(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artistID := utils.GetParam(r, "id")

		// Ensure artist exists
		if _, err := uc.GetArtistByID(ctx, artistID); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Artist not found")
			return
		}

		var m models.BandMember
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		m.Name = strings.TrimSpace(m.Name)
		m.Role = strings.TrimSpace(m.Role)
		m.DOB = strings.TrimSpace(m.DOB)
		m.Image = strings.TrimSpace(m.Image)
		m.ReferenceArtist = strings.TrimSpace(m.ReferenceArtist)

		if m.Name == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Member name is required")
			return
		}

		if m.MemberID == "" {
			m.MemberID, _ = utils.GenerateRandomString(12)
		}

		if err := uc.AddMember(ctx, artistID, m); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to add member")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BandMemberAddedEvent, mqevent.BandMemberAddedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, m)
	}
}

func UpdateArtistMember(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		artistID := utils.GetParam(r, "id")
		memberID := utils.GetParam(r, "memberId")

		var payload map[string]string
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON body")
			return
		}

		updates := bson.M{}

		if v, ok := payload["name"]; ok {
			updates["members.$.name"] = strings.TrimSpace(v)
		}
		if v, ok := payload["role"]; ok {
			updates["members.$.role"] = strings.TrimSpace(v)
		}
		if v, ok := payload["dob"]; ok {
			updates["members.$.dob"] = strings.TrimSpace(v)
		}
		if v, ok := payload["image"]; ok {
			updates["members.$.image"] = strings.TrimSpace(v)
		}

		if len(updates) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "No valid fields to update")
			return
		}

		if err := uc.UpdateMember(ctx, artistID, memberID, bson.M{"$set": updates}); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update member")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BandMemberUpdatedEvent, mqevent.BandMemberUpdatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, bson.M{
			"message": "Member updated",
		})
	}
}

func DeleteArtistMember(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := aust.NewArtistUsecase(repoImpl, app.MQ)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		artistID := utils.GetParam(r, "id")
		memberID := utils.GetParam(r, "memberId")

		if err := uc.DeleteMember(ctx, artistID, memberID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete member")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.BandMemberDeletedEvent, mqevent.BandMemberDeletedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, bson.M{
			"message": "Member deleted",
		})
	}
}
