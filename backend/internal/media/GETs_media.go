package media

import (
	"context"
	"net/http"
	"time"

	"scav/infra"
	"scav/utils"
)

func GetMedia(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")
		mediaID := utils.GetParam(r, "id")

		media, err := getMediaByID(ctx, app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, media)
	}
}

// ---------------------- Get Medias ----------------------
func GetMedias(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		medias, err := listMediaByEntity(ctx, app, utils.GetParam(r, "entitytype"), utils.GetParam(r, "entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, medias)
	}
}

// ---------------------- Get Media Groups ----------------------
func GetMediaGroups(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		groups, err := getMediaGroupsByEntity(ctx, app, utils.GetParam(r, "entitytype"), utils.GetParam(r, "entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groups)
	}
}
