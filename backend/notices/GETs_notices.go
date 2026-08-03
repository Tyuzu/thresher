package notices

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// --- Get notices list (optimized: summary only) ---
func GetNotices(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		page := 1
		limit := 10
		if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && p > 0 {
			page = p
		}
		if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
			limit = l
		}

		sortBy := r.URL.Query().Get("sort")
		var sort bson.D

		if sortBy == "old" {
			sort = bson.D{{Key: "createdAt", Value: 1}}
		} else {
			sort = bson.D{{Key: "createdAt", Value: -1}}
		}

		filter := bson.M{
			"entitytype": entityType,
			"entityid":   entityID,
		}

		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  (page - 1) * limit,
			Sort:  sort,
		}

		var notices []models.Notice
		if err := app.DB.FindManyWithOptions(ctx, noticesCollection, filter, opts, &notices); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch notices")
			return
		}

		// Only return summary fields
		type NoticeSummary struct {
			ID        string    `json:"noticeid"`
			Title     string    `json:"title"`
			Summary   string    `json:"summary"`
			CreatedBy string    `json:"createdby"`
			CreatedAt time.Time `json:"createdat"`
		}

		resp := make([]NoticeSummary, len(notices))
		for i, n := range notices {
			resp[i] = NoticeSummary{
				ID:        n.NoticeID, // string ID
				Title:     n.Title,
				Summary:   n.Summary,
				CreatedBy: n.CreatedBy,
				CreatedAt: n.CreatedAt,
			}
		}

		utils.RespondWithJSON(w, http.StatusOK, resp)
	}
}

// --- Get single notice ---
func GetNotice(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		noticeID := strings.TrimSpace(utils.GetParam(r, "noticeid"))
		if noticeID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		var notice models.Notice
		if err := app.DB.FindOne(
			ctx,
			noticesCollection,
			bson.M{"noticeid": noticeID},
			&notice,
		); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Notice not found")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, notice)
	}
}
