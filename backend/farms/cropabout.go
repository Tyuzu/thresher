package farms

import (
	"context"
	"errors"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateCropAboutHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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

		if err := CreateCropAbout(ctx, app, &crop); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to create crop",
			)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.CropAboutCreatedEvent, mqevent.CropAboutCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"success": true,
		})
	}
}

func GetCropAboutHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		crop, err := GetCropAbout(
			ctx,
			app,
			ps.ByName("cropID"),
		)

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

func GetAllCropAboutsHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		crops, err := GetAllCropAbouts(ctx, app)
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

func UpdateCropAboutHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

		err := UpdateCropAbout(
			ctx,
			app,
			ps.ByName("cropID"),
			&crop,
		)

		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to update crop",
			)
			return
		}
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.CropAboutUpdatedEvent, mqevent.CropAboutUpdatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
		})
	}
}

func DeleteCropAboutHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		err := DeleteCropAbout(
			ctx,
			app,
			ps.ByName("cropID"),
		)

		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to delete crop",
			)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.CropAboutDeletedEvent, mqevent.CropAboutDeletedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
		})
	}
}
