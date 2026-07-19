package media

import (
	"context"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

func GetMedia(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		entityType := ps.ByName("entitytype")
		entityID := ps.ByName("entityid")
		mediaID := ps.ByName("id")

		media, err := getMediaByID(ctx, app, entityType, entityID, mediaID)
		if err != nil {
			http.Error(w, "Media not found", http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, media)
	}
}

// ---------------------- Get Medias ----------------------
func GetMedias(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		medias, err := listMediaByEntity(ctx, app, ps.ByName("entitytype"), ps.ByName("entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, medias)
	}
}

// ---------------------- Get Media Groups ----------------------
func GetMediaGroups(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		groups, err := getMediaGroupsByEntity(ctx, app, ps.ByName("entitytype"), ps.ByName("entityid"))
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to retrieve media")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groups)
	}
}
