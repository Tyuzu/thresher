package booking

import (
	"context"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

func ListSlots(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		entityType := r.URL.Query().Get("entityType")
		entityID := r.URL.Query().Get("entityId")

		filter := bson.M{}
		if entityType != "" {
			filter["entityType"] = entityType
		}
		if entityID != "" {
			filter["entityId"] = entityID
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var slots []models.Slot
		if err := FindSlots(ctx, app.DB, filter, &slots); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"slots": slots,
		})
	}
}

func ListBookings(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		entityType := r.URL.Query().Get("entityType")
		entityID := r.URL.Query().Get("entityId")
		status := r.URL.Query().Get("status")

		filter := bson.M{}
		if entityType != "" {
			filter["entityType"] = entityType
		}
		if entityID != "" {
			filter["entityId"] = entityID
		}
		if status != "" {
			filter["status"] = status
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var bookings []models.Booking
		if err := FindBookings(ctx, app.DB, filter, &bookings); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"bookings": bookings,
		})
	}
}

func GetDateCapacity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		entityType := r.URL.Query().Get("entityType")
		entityID := r.URL.Query().Get("entityId")
		date := r.URL.Query().Get("date")

		if entityType == "" || entityID == "" || date == "" {
			http.Error(w, "missing params", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var dc models.DateCap
		err := FindDateCap(ctx, app.DB, entityType, entityID, date, &dc)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusOK, map[string]any{
				"capacity": nil,
			})
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"capacity": dc.Capacity,
		})
	}
}

func ListTiers(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		entityType := r.URL.Query().Get("entityType")
		entityID := r.URL.Query().Get("entityId")

		filter := bson.M{}
		if entityType != "" {
			filter["entityType"] = entityType
		}
		if entityID != "" {
			filter["entityId"] = entityID
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var tiers []models.Tier
		if err := FindTiers(ctx, app.DB, filter, &tiers); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"tiers": tiers,
		})
	}
}
