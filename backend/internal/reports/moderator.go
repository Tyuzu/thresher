package reports

import (
	"net/http"

	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func GetReportsForMod(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		filter := bson.M{
			"status": bson.M{
				"$nin": []string{"resolved", "rejected"},
			},
		}

		var reports []Report
		err := app.DB.FindMany(ctx, reportsCollection, filter, &reports)
		if err != nil {
			http.Error(w, `{"error":"Failed to fetch reports"}`, http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, reports)
	}
}
