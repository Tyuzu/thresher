package baito

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

/* -------------------- Workers -------------------- */

func GetWorkerById(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var worker models.BaitoWorker
		err := app.DB.FindOne(
			ctx,
			BaitoWorkersCollection,
			bson.M{"baitoWorkerId": utils.GetParam(r, "workerId")},
			&worker,
		)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				utils.RespondWithError(w, http.StatusNotFound, "Worker not found")
			} else {
				log.Printf("DB error: %v", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch worker")
			}
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, worker)
	}
}

func GetWorkerSkills(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		skills, err := getUniqueWorkerSkillsFromDB(ctx, app)
		if err != nil {
			log.Printf("Aggregate error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch skills")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, skills)
	}
}

// GetWorkers returns a list of workers with optional search and skill filtering.
func GetWorkers(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		search := strings.TrimSpace(r.URL.Query().Get("search"))
		skill := strings.TrimSpace(r.URL.Query().Get("skill"))

		filter := map[string]any{}

		if search != "" {
			filter["$or"] = []any{
				map[string]any{"name_contains": search},
				map[string]any{"location_contains": search},
				map[string]any{"bio_contains": search},
			}
		}

		if skill != "" {
			filter["preferredRoles"] = skill
		}

		skip, limit := utils.ParsePagination(r, 10, 100)

		opts := db.FindManyOptions{
			Skip:  skip,
			Limit: limit,
			Sort:  bson.D{{Key: "createdAt", Value: -1}},
		}

		var workers []models.BaitoWorkersResponse
		if err := app.DB.FindManyWithOptions(ctx, BaitoWorkersCollection, filter, opts, &workers); err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				workers = []models.BaitoWorkersResponse{}
			} else {
				log.Printf("DB error: %v", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch workers")
				return
			}
		}

		total, err := app.DB.CountDocuments(ctx, BaitoWorkersCollection, filter)
		if err != nil {
			log.Printf("Count error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch workers")
			return
		}

		if workers == nil {
			workers = []models.BaitoWorkersResponse{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"data":  workers,
			"total": total,
		})
	}
}
