package farms

import (
	"context"
	"errors"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"
	"time"

	"naevis/farms/repo"
	fu "naevis/farms/usecase"

	"go.mongodb.org/mongo-driver/mongo"
)

func CreateCropAboutHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var crop models.CropAbout

		if err := utils.ParseJSON(r, &crop); err != nil {
			utils.RespondWithError(
				w,
				http.StatusBadRequest,
				"Invalid request body",
			)
			return
		}

		if crop.ID == "" {
			utils.RespondWithError(
				w,
				http.StatusBadRequest,
				"Crop ID is required",
			)
			return
		}

		if err := uc.CreateCropAbout(ctx, crop); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to create crop",
			)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CropAboutCreatedEvent, mqevent.CropAboutCreatedPayload{}); err != nil {
			log.Printf("failed to publish crop about created event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"success": true,
		})
	}
}

func GetCropAboutHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		crop, err := uc.GetCropAbout(ctx, utils.GetParam(r, "cropID"))

		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				utils.RespondWithError(
					w,
					http.StatusNotFound,
					"Crop not found",
				)
				return
			}

			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to load crop",
			)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"crop":    crop,
		})
	}
}

func GetAllCropAboutsHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		crops, err := uc.GetAllCropAbouts(ctx)
		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to load crops",
			)
			return
		}

		if crops == nil {
			crops = []models.CropAbout{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"crops":   crops,
		})
	}
}

func UpdateCropAboutHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var crop models.CropAbout

		if err := utils.ParseJSON(r, &crop); err != nil {
			utils.RespondWithError(
				w,
				http.StatusBadRequest,
				"Invalid request body",
			)
			return
		}

		if err := uc.UpdateCropAbout(ctx, utils.GetParam(r, "cropID"), crop); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to update crop",
			)
			return
		}
		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CropAboutUpdatedEvent, mqevent.CropAboutUpdatedPayload{}); err != nil {
			log.Printf("failed to publish crop about updated event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
		})
	}
}

func DeleteCropAboutHandler(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := uc.DeleteCropAbout(ctx, utils.GetParam(r, "cropID")); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to delete crop",
			)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CropAboutDeletedEvent, mqevent.CropAboutDeletedPayload{}); err != nil {
			log.Printf("failed to publish crop about deleted event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
		})
	}
}
