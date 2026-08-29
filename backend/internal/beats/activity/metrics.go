package activity

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"scav/infra"
	"scav/infra/db"
	"scav/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// AnalyticsPayload represents the incoming batch payload from activityLogger.js
type AnalyticsPayload struct {
	Meta   map[string]any   `json:"meta"`
	Events []map[string]any `json:"events"`
}

// -------------------- MongoDB Helpers --------------------

func insertActivities(
	ctx context.Context,
	app *infra.Deps,
	activities []Activity,
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
) ([]Activity, error) {
	// FIX: Matched struct bson tag "user_id" instead of "userid"
	filter := bson.M{
		"user_id": userID,
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

	var activities []Activity

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
	payload AnalyticsPayload,
	remoteAddr string,
) (int, error) {
	var docsToInsert []any

	meta := payload.Meta
	user, _ := meta["user"].(string)
	session, _ := meta["session"].(string)
	url, _ := meta["url"].(string)

	err := app.DB.WithDB(ctx, func(ctx context.Context) error {
		for _, ev := range payload.Events {
			key := analyticsIdempotencyKey(ev)

			ok, err := app.Cache.SetNX(ctx, key, []byte("1"), analyticsIdemTTL)
			if err != nil || !ok {
				continue
			}

			// Consolidate payload metadata with specific event data
			doc := bson.M{
				"type":      ev["type"],
				"data":      ev["data"],
				"url":       url,
				"user":      user,
				"session":   session,
				"timestamp": time.Now(),
				"ip":        remoteAddr,
			}

			docsToInsert = append(docsToInsert, doc)
		}

		if len(docsToInsert) == 0 {
			return nil
		}

		// FIX: Use batch insertion rather than loops of single inserts
		return app.DB.InsertMany(ctx, AnalyticsCollection, docsToInsert)
	})

	return len(docsToInsert), err
}

// -------------------- Log Activities --------------------

func LogActivities(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var activities []Activity
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

func GetActivityFeed(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

func HandleAnalyticsEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload AnalyticsPayload

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
			payload,
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
