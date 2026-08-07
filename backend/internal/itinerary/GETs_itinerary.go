package itinerary

import (
	"context"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"time"
)

// GET /api/itineraries/all/:id
func GetItinerary(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itineraryID := utils.GetParam(r, "id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		itinerary, err := findItineraryByID(ctx, app, itineraryID)
		if err != nil {
			http.Error(w, "Itinerary not found", http.StatusNotFound)
			return
		}

		normalizeItinerary(&itinerary)
		utils.RespondWithJSON(w, http.StatusOK, itinerary)
	}
}

// GET /api/itineraries
func GetItineraries(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		itineraries, err := findItineraries(ctx, app, map[string]any{"deleted": map[string]any{"$ne": true}})
		if err != nil {
			http.Error(w, "Error fetching itineraries", http.StatusInternalServerError)
			return
		}

		if itineraries == nil {
			itineraries = []Itinerary{}
		}

		for i := range itineraries {
			normalizeItinerary(&itineraries[i])
		}

		utils.RespondWithJSON(w, http.StatusOK, itineraries)
	}
}

// GET /api/itineraries/search
func SearchItineraries(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()

		filter := map[string]any{"deleted": map[string]any{"$ne": true}}
		if start := query.Get("start_date"); start != "" {
			filter["start_date"] = start
		}
		if location := query.Get("location"); location != "" {
			filter["days.visits.location"] = map[string]any{"$in": []string{location}}
		}
		if status := query.Get("status"); status != "" {
			filter["status"] = status
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		itineraries, err := findItineraries(ctx, app, filter)
		if err != nil {
			http.Error(w, "Error fetching itineraries", http.StatusInternalServerError)
			return
		}

		if itineraries == nil {
			itineraries = []Itinerary{}
		}

		for i := range itineraries {
			normalizeItinerary(&itineraries[i])
		}

		utils.RespondWithJSON(w, http.StatusOK, itineraries)
	}
}
