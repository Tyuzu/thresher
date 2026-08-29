package reports

import (
	"net/http"
	"strconv"
	"strings"

	"scav/infra"
	"scav/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func GetAppeals(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		q := r.URL.Query()

		status := strings.TrimSpace(q.Get("status"))
		if status == "" {
			status = "pending"
		}

		filter := bson.M{"status": status}

		limit := int64(20)
		offset := int64(0)

		if l := strings.TrimSpace(q.Get("limit")); l != "" {
			if v, err := strconv.ParseInt(l, 10, 64); err == nil && v > 0 {
				limit = v
			}
		}
		if o := strings.TrimSpace(q.Get("offset")); o != "" {
			if v, err := strconv.ParseInt(o, 10, 64); err == nil && v >= 0 {
				offset = v
			}
		}

		var appeals []bson.M
		if err := app.DB.FindMany(ctx, appealsCollection, filter, &appeals); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "Failed to fetch appeals",
			})
			return
		}

		utils.SortAndSlice(
			&appeals,
			bson.D{{Key: "createdAt", Value: -1}},
			offset,
			limit,
		)

		if appeals == nil {
			appeals = []bson.M{}
		}

		utils.RespondWithJSON(w, http.StatusOK, appeals)
	}
}
