package merch

import (
	"context"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func GetMerch(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entityType := utils.GetParam(r, "entityType")
		eventID := utils.GetParam(r, "eventid")
		merchID := utils.GetParam(r, "merchid")

		if !validateEntityType(entityType) {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid entity type",
			})
			return
		}

		var merch Merch
		err := app.DB.FindOne(
			r.Context(),
			merchCollection,
			bson.M{
				"entity_type": entityType,
				"entity_id":   eventID,
				"merchid":     merchID,
				"deletedAt":   bson.M{"$exists": false},
			},
			&merch,
		)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]any{
				"success": false,
				"error":   "merch not found",
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    merch,
		})
	}
}

func GetMerchs(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entityType := utils.GetParam(r, "entityType")
		eventID := utils.GetParam(r, "eventid")

		if !validateEntityType(entityType) {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid entity type",
			})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var list []Merch
		err := app.DB.FindMany(
			ctx,
			merchCollection,
			bson.M{
				"entity_type": entityType,
				"entity_id":   eventID,
				"deletedAt":   bson.M{"$exists": false},
			},
			&list,
		)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]any{
				"success": false,
				"error":   "failed to fetch merch",
			})
			return
		}

		if list == nil {
			list = []Merch{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    list,
		})
	}
}

func GetMerchPage(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		merchID := utils.GetParam(r, "entityType") // route constraint

		var merch Merch
		err := app.DB.FindOne(
			r.Context(),
			merchCollection,
			bson.M{
				"merchid":   merchID,
				"deletedAt": bson.M{"$exists": false},
			},
			&merch,
		)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]any{
				"success": false,
				"error":   "merch not found",
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    merch,
		})
	}
}
