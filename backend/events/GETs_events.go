package events

import (
	"context"
	"errors"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"

	"naevis/events/repo"
	eu "naevis/events/usecase"
)

// GetEvent fetches a single event with its tickets, media, and merch.
func GetEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		eventID := utils.GetParam(r, "eventid")
		if eventID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing event ID")
			return
		}

		// prefer usecase find; fallback to legacy aggregate if not implemented
		repoImpl := repo.NewMongoRepo(app.DB)
		uc := eu.NewEventUsecase(repoImpl)

		event, err := uc.FindEvent(ctx, eventID)
		if err != nil {
			// fallback to legacy aggregate
			event, err = AggregateEvent(ctx, app, eventID)
		}
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				utils.RespondWithError(w, http.StatusNotFound, "Event not found")
				return
			}
			log.Println("Aggregate error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch event")
			return
		}

		safe := toSafeEvent(*event)
		utils.RespondWithJSON(w, http.StatusOK, safe)
	}
}

// GetEvents fetches paginated events.
func GetEvents(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		skip, limit := utils.ParsePagination(r, 10, 100)
		filter := bson.M{} // e.g. bson.M{"published": true}

		totalCount, err := CountEvents(ctx, app, filter)
		if err != nil {
			log.Println("CountDocuments error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch event count")
			return
		}

		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  skip,
			Sort:  bson.D{{Key: "createdAt", Value: -1}},
		}

		rawEvents, err := ListEvents(ctx, app, filter, opts)
		if err != nil {
			log.Println("ListEvents error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch events")
			return
		}

		safeEvents := make([]models.Event, 0, len(rawEvents))
		for _, e := range rawEvents {
			safeEvents = append(safeEvents, toSafeEvent(e))
		}

		page := 1
		if limit > 0 {
			page = (skip / limit) + 1
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"events":     safeEvents,
			"eventCount": totalCount,
			"page":       page,
			"limit":      limit,
		})
	}
}

// GetEventsCount returns the total count of published events.
func GetEventsCount(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		filter := bson.M{"published": true}
		count, err := CountEvents(ctx, app, filter)
		if err != nil {
			log.Println("CountEvents error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch event count")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]int64{
			"count": count,
		})
	}
}
