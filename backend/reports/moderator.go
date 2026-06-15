package reports

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/infra"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

type ModeratorApplication struct {
	ID        string    `bson:"id" json:"id"`
	UserID    string    `bson:"userId" json:"userId"`
	Reason    string    `bson:"reason" json:"reason"`
	Status    string    `bson:"status" json:"status"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

func ApplyModerator(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		var payload struct {
			Reason string `json:"reason"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := strings.TrimSpace(utils.GetUserIDFromRequest(r))
		reason := strings.TrimSpace(payload.Reason)

		if userID == "" || reason == "" {
			writeError(w, "Missing required fields", http.StatusBadRequest)
			return
		}

		var existing ModeratorApplication
		err := app.DB.FindOne(
			ctx,
			moderatorAppsCollection,
			bson.M{"userId": userID},
			&existing,
		)
		if err == nil {
			writeError(w, "You have already applied to be a moderator", http.StatusConflict)
			return
		}

		now := time.Now().UTC()
		appx := ModeratorApplication{
			ID:        "mod_" + utils.GenerateRandomString(16),
			UserID:    userID,
			Reason:    reason,
			Status:    "pending",
			CreatedAt: now,
			UpdatedAt: now,
		}

		if err := app.DB.Insert(ctx, moderatorAppsCollection, appx); err != nil {
			writeError(w, "Failed to save application", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{
			"message": "Moderator application submitted",
			"id":      appx.ID,
		})
	}
}

func ListModeratorApplications(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		q := r.URL.Query()

		filter := bson.M{}
		if status := strings.TrimSpace(q.Get("status")); status != "" && status != "all" {
			filter["status"] = status
		}

		limit := int64(100)
		offset := int64(0)

		if v, err := strconv.ParseInt(strings.TrimSpace(q.Get("limit")), 10, 64); err == nil && v > 0 {
			if v > 200 {
				limit = 200
			} else {
				limit = v
			}
		}
		if v, err := strconv.ParseInt(strings.TrimSpace(q.Get("offset")), 10, 64); err == nil && v >= 0 {
			offset = v
		}

		var applications []ModeratorApplication
		err := app.DB.FindMany(ctx, moderatorAppsCollection, filter, &applications)
		if err != nil {
			writeError(w, "Failed to fetch applications", http.StatusInternalServerError)
			return
		}

		utils.SortAndSlice(
			&applications,
			bson.D{{Key: "createdAt", Value: -1}},
			offset,
			limit,
		)

		if applications == nil {
			applications = []ModeratorApplication{}
		}

		writeJSON(w, http.StatusOK, applications)
	}
}

func ApproveModerator(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		id := strings.TrimSpace(ps.ByName("id"))
		if id == "" {
			writeError(w, "Invalid ID", http.StatusBadRequest)
			return
		}

		var application ModeratorApplication
		if err := app.DB.FindOne(ctx, moderatorAppsCollection, bson.M{"id": id}, &application); err != nil {
			writeError(w, "Application not found", http.StatusNotFound)
			return
		}

		now := time.Now().UTC()
		if err := app.DB.Update(
			ctx,
			moderatorAppsCollection,
			bson.M{"id": id},
			bson.M{
				"status":    "approved",
				"updatedAt": now,
			},
		); err != nil {
			writeError(w, "Failed to update application", http.StatusInternalServerError)
			return
		}

		if err := promoteUserToModerator(ctx, app, application.UserID); err != nil {
			writeError(w, "Failed to promote user", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"message": "Application approved",
		})
	}
}

func RejectModerator(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		id := strings.TrimSpace(ps.ByName("id"))
		if id == "" {
			writeError(w, "Invalid ID", http.StatusBadRequest)
			return
		}

		var application ModeratorApplication
		if err := app.DB.FindOne(ctx, moderatorAppsCollection, bson.M{"id": id}, &application); err != nil {
			writeError(w, "Application not found", http.StatusNotFound)
			return
		}

		now := time.Now().UTC()
		if err := app.DB.Update(
			ctx,
			moderatorAppsCollection,
			bson.M{"id": id},
			bson.M{
				"status":    "rejected",
				"updatedAt": now,
			},
		); err != nil {
			writeError(w, "Failed to update application", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"message": "Application rejected",
		})
	}
}

func promoteUserToModerator(ctx context.Context, app *infra.Deps, userID string) error {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return errors.New("missing user id")
	}

	return app.DB.Update(
		ctx,
		usersCollection,
		bson.M{"userid": userID},
		bson.M{
			"$set": bson.M{
				"role":      "moderator",
				"updatedAt": time.Now().UTC(),
			},
			"$addToSet": bson.M{
				"roles": "moderator",
			},
		},
	)
}
