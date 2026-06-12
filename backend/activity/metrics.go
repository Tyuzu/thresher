package activity

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// -------------------- MongoDB Helpers --------------------

func insertActivities(
	ctx context.Context,
	app *infra.Deps,
	activities []models.Activity,
) error {
	docs := make([]any, len(activities))
	for i := range activities {
		docs[i] = activities[i]
	}

	return app.DB.WithDB(ctx, func(ctx context.Context) error {
		return app.DB.InsertMany(ctx, ActivitiesCollection, docs)
	})
}

func getActivities(
	ctx context.Context,
	app *infra.Deps,
	userID string,
	cursor time.Time,
	limit int,
) ([]models.Activity, error) {
	filter := bson.M{
		"userid": userID,
	}

	if !cursor.IsZero() {
		filter["timestamp"] = bson.M{
			"$lt": cursor,
		}
	}

	opts := db.FindManyOptions{
		Limit: limit,
		Sort:  bson.D{{Key: "timestamp", Value: -1}},
	}

	var activities []models.Activity

	err := app.DB.FindManyWithOptions(
		ctx,
		ActivitiesCollection,
		filter,
		opts,
		&activities,
	)

	return activities, err
}

func insertAnalyticsEvents(
	ctx context.Context,
	app *infra.Deps,
	events []map[string]any,
	remoteAddr string,
) (int, error) {
	inserted := 0

	err := app.DB.WithDB(ctx, func(ctx context.Context) error {
		for _, ev := range events {
			key := analyticsIdempotencyKey(ev)

			ok, err := app.Cache.SetNX(ctx, key, []byte("1"), analyticsIdemTTL)
			if err != nil || !ok {
				continue
			}

			doc := bson.M{
				"type":      ev["type"],
				"data":      ev["data"],
				"url":       ev["url"],
				"user":      ev["user"],
				"session":   ev["session"],
				"timestamp": time.Now(),
				"ip":        remoteAddr,
			}

			if err := app.DB.Insert(ctx, AnalyticsCollection, doc); err != nil {
				return err
			}

			inserted++
		}

		return nil
	})

	return inserted, err
}

// -------------------- Log Activities --------------------

func LogActivities(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var activities []models.Activity
		if err := json.NewDecoder(r.Body).Decode(&activities); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		now := time.Now()

		for i := range activities {
			activities[i].UserID = userID
			activities[i].Timestamp = now
		}

		if err := insertActivities(r.Context(), app, activities); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "failed to insert activities")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]int{
			"inserted": len(activities),
		})
	}
}

// -------------------- Activity Feed --------------------

func GetActivityFeed(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		cursor, limit := parseCursor(r)

		activities, err := getActivities(
			r.Context(),
			app,
			userID,
			cursor,
			limit,
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "fetch failed")
			return
		}

		var nextCursor time.Time
		if len(activities) > 0 {
			nextCursor = activities[len(activities)-1].Timestamp
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"items":      activities,
			"nextCursor": nextCursor,
			"limit":      limit,
		})
	}
}

// -------------------- Analytics --------------------

func HandleAnalyticsEvent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		var payload struct {
			Events []map[string]any `json:"events"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		if len(payload.Events) == 0 {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		inserted, err := insertAnalyticsEvents(
			r.Context(),
			app,
			payload.Events,
			r.RemoteAddr,
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "analytics insert failed")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]int{
			"inserted": inserted,
		})
	}
}
