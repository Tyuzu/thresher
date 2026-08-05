package fanmade

import (
	"context"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"time"
)

// GetMedia returns a single media item by ID
func GetMedia(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")
		mediaID := utils.GetParam(r, "id")

		media, err := getFanMediaByID(r.Context(), app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, media)
	}
}

// GetMedias returns all media for an entity
func GetMedias(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		medias, err := listFanMediasByEntity(ctx, app, utils.GetParam(r, "entitytype"), utils.GetParam(r, "entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, medias)
	}
}

// GetMediaGroups returns media grouped by MediaGroupID
func GetMediaGroups(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		groups, err := listFanMediaGroupsByEntity(ctx, app, utils.GetParam(r, "entitytype"), utils.GetParam(r, "entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groups)
	}
}
