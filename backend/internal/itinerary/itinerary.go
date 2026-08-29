package itinerary

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"
)

// normalizeItinerary ensures slices are never nil
func normalizeItinerary(it *Itinerary) {
	if it.Days == nil {
		it.Days = []Day{}
		return
	}
	for i := range it.Days {
		if it.Days[i].Visits == nil {
			it.Days[i].Visits = []Visit{}
		}
	}
}

// extract user ID from request
func GetRequestingUserID(_ http.ResponseWriter, r *http.Request) (string, error) {
	return utils.GetUserIDFromRequest(r), nil
}

// POST /api/itineraries
func CreateItinerary(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var it Itinerary
		if err := json.NewDecoder(r.Body).Decode(&it); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}

		userID, err := GetRequestingUserID(w, r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		it.ItineraryID = utils.GenerateRandomString(13)
		it.UserID = userID
		it.Published = false
		if it.Status == "" {
			it.Status = "Draft"
		}

		normalizeItinerary(&it)

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := insertItinerary(ctx, app, it); err != nil {
			http.Error(w, "Error inserting itinerary", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ItineraryCreatedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.ItineraryCreatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, it)
	}
}

// PUT /api/itineraries/:id
func UpdateItinerary(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := GetRequestingUserID(w, r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		itineraryID := utils.GetParam(r, "id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		existing, err := findItineraryByID(ctx, app, itineraryID)
		if err != nil {
			http.Error(w, "Itinerary not found", http.StatusNotFound)
			return
		}

		if existing.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		var updated Itinerary
		if err := json.NewDecoder(r.Body).Decode(&updated); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		normalizeItinerary(&updated)

		update := map[string]any{
			"$set": map[string]any{
				"name":        updated.Name,
				"description": updated.Description,
				"start_date":  updated.StartDate,
				"end_date":    updated.EndDate,
				"status":      updated.Status,
				"published":   updated.Published,
				"days":        updated.Days,
			},
		}

		if _, err := updateItineraryFields(ctx, app, itineraryID, update); err != nil {
			http.Error(w, "Error updating itinerary", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ItineraryUpdatedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.ItineraryUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"status": "200", "message": "Itinerary updated successfully"})
	}
}

// DELETE /api/itineraries/:id (soft delete)
func DeleteItinerary(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := GetRequestingUserID(w, r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		itineraryID := utils.GetParam(r, "id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if _, err := softDeleteItinerary(ctx, app, itineraryID, userID); err != nil {
			http.Error(w, "Itinerary not found or forbidden", http.StatusNotFound)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ItineraryDeletedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.ItineraryDeletedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"message": "Itinerary deleted"})
	}
}

// POST /api/itineraries/:id/fork
func ForkItinerary(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := GetRequestingUserID(w, r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		originalID := utils.GetParam(r, "id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		original, err := findItineraryByID(ctx, app, originalID)
		if err != nil {
			http.Error(w, "Original itinerary not found", http.StatusNotFound)
			return
		}

		normalizeItinerary(&original)

		newItinerary := Itinerary{
			ItineraryID: utils.GenerateRandomString(13),
			UserID:      userID,
			Name:        "Forked - " + original.Name,
			Description: original.Description,
			StartDate:   original.StartDate,
			EndDate:     original.EndDate,
			Days:        original.Days,
			Status:      "Draft",
			Published:   false,
			ForkedFrom:  &originalID,
		}

		if err := insertItinerary(ctx, app, newItinerary); err != nil {
			http.Error(w, "Error forking itinerary", http.StatusInternalServerError)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ItineraryForkedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.ItineraryForkedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, newItinerary)
	}
}

// PUT /api/itineraries/:id/publish
func PublishItinerary(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := GetRequestingUserID(w, r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := utils.GetParam(r, "id")
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if _, err := publishItinerary(ctx, app, id, userID); err != nil {
			http.Error(w, "Itinerary not found or forbidden", http.StatusNotFound)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ItineraryPublishedPayload{})

		mq.PublishWithMeta(ctx, app.MQ, mqevent.ItineraryPublishedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"published": true})
	}
}
