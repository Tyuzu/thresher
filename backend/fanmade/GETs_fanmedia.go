package fanmade

import (
	"context"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// GetMedia returns a single media item by ID
func GetMedia(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		entityType := ps.ByName("entitytype")
		entityID := ps.ByName("entityid")
		mediaID := ps.ByName("id")

		media, err := getFanMediaByID(r.Context(), app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, media)
	}
}

// GetMedias returns all media for an entity
func GetMedias(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		medias, err := listFanMediasByEntity(ctx, app, ps.ByName("entitytype"), ps.ByName("entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, medias)
	}
}

// GetMediaGroups returns media grouped by MediaGroupID
func GetMediaGroups(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		groups, err := listFanMediaGroupsByEntity(ctx, app, ps.ByName("entitytype"), ps.ByName("entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groups)
	}
}
