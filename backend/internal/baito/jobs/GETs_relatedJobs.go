package jobs

import (
	"naevis/infra"
	"naevis/internal/baito"
	"naevis/utils"
	"net/http"
)

// ------------------ READ LIST ------------------
func GetJobsRelatedTOEntity(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		var jobs []baito.BaitosResponse
		if err := app.DB.FindMany(ctx, baitosCollection, map[string]any{
			"entityType": entityType,
			"entityId":   entityID,
		}, &jobs); err != nil {
			http.Error(w, "Failed to fetch jobs", http.StatusInternalServerError)
			return
		}

		if jobs == nil {
			jobs = []baito.BaitosResponse{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"jobs": jobs})
	}
}
