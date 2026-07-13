package baito

import (
	"context"
	"net/http"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"naevis/utils/logger"
	log "naevis/utils/logger"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

/* -------------------- Helpers -------------------- */

func enrichBaitoApplicationCount(ctx *context.Context, app *infra.Deps, baito *models.Baito) error {
	count, err := app.DB.CountDocuments(*ctx, BaitoAppCollection, bson.M{"baitoid": baito.BaitoId})
	if err != nil {
		return err
	}

	baito.ApplicationCount = int(count)
	return nil
}

func respondBaitos(w http.ResponseWriter, baitos []models.BaitosResponse) {
	if baitos == nil {
		baitos = []models.BaitosResponse{}
	}
	utils.RespondWithJSON(w, http.StatusOK, baitos)
}

/* -------------------- Handlers -------------------- */

func GetLatestBaitos(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		baitos, err := findLatestBaitosFromDB(ctx, app, bson.M{}, 20)
		if err != nil {
			logger.Printf("DB error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		respondBaitos(w, baitos)
	}
}

func GetRelatedBaitos(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		category := r.URL.Query().Get("category")
		exclude := r.URL.Query().Get("exclude")

		filter := map[string]any{}
		if category != "" {
			filter["category"] = category
		}
		if exclude != "" {
			filter["baitoid_ne"] = exclude
		}

		baitos, err := findRelatedBaitosFromDB(ctx, app, filter, 10)
		if err != nil {
			logger.Printf("DB error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		// fallback if none found
		if len(baitos) == 0 {
			fallback := map[string]any{}
			if exclude != "" {
				fallback["baitoid_ne"] = exclude
			}

			baitos, _ = findRelatedBaitosFromDB(ctx, app, fallback, 10)
		}

		respondBaitos(w, baitos)
	}
}

func GetBaitoByID(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		id := ps.ByName("baitoid")

		b, err := findBaitoByIDFromDB(ctx, app, id)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				utils.RespondWithError(w, http.StatusNotFound, "Not found")
			} else {
				logger.Printf("DB error: %v", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			}
			return
		}

		if err := enrichBaitoApplicationCount(&ctx, app, &b); err != nil {
			logger.Printf("Failed to count applications for baito %s: %v", id, err)
		}

		utils.RespondWithJSON(w, http.StatusOK, b)
	}
}

func GetMyBaitos(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)

		baitos, err := findMyBaitosFromDB(ctx, app, userID)
		if err != nil {
			log.Printf("DB error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		respondBaitos(w, baitos)
	}
}

func GetBaitoApplicants(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		baitoID := ps.ByName("baitoid")

		results, err := findBaitoApplicantsFromDB(ctx, app, baitoID)
		if err != nil {
			log.Printf("DB error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, results)
	}
}

func GetMyApplications(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)

		results, err := findMyApplicationsFromDB(ctx, app, userID)
		if err != nil {
			logger.Printf("Aggregate error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch applications")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, results)
	}
}
