package reports

import (
	"encoding/json"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

type ModeratorApplication struct {
	ID        string    `json:"id" bson:"id"`
	UserID    string    `json:"userid" bson:"userid"`
	Reason    string    `json:"reason" bson:"reason"`
	Status    string    `json:"status" bson:"status"`
	CreatedAt time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt time.Time `json:"updatedat" bson:"updatedat"`
}

// ---------------------- List Moderator Applications ----------------------
// Optional query param: ?status=pending|approved|rejected
func ListModeratorApplications(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		status := r.URL.Query().Get("status")

		filter := bson.M{}
		if status != "" {
			filter["status"] = status
		}

		var applications []ModeratorApplication
		err := app.DB.FindMany(
			ctx,
			moderatorAppsCollection,
			filter,
			&applications,
		)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "Failed to fetch applications",
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, applications)
	}
}

// ---------------------- Approve Moderator Application ----------------------
func ApproveModerator(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		id := utils.GetParam(r, "id")
		if id == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{
				"error": "Invalid or missing application ID",
			})
			return
		}

		err := app.DB.UpdateOne(
			ctx,
			moderatorAppsCollection,
			bson.M{"id": id},
			bson.M{
				"$set": bson.M{
					"status":    "approved",
					"updatedat": time.Now().UTC(),
				},
			},
		)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]string{
				"error": "Application not found or update failed",
			})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.ApprovedModeratorRoleRequestPayload{
			ApplicationID: id,
			ApprovedAt:    time.Now().UTC(),
		})
		_ = app.MQ.Publish(ctx, mqevent.ApprovedModeratorRoleRequestEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Application approved successfully",
		})
	}
}

// ---------------------- Reject Moderator Application ----------------------
func RejectModerator(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		id := utils.GetParam(r, "id")
		if id == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{
				"error": "Invalid or missing application ID",
			})
			return
		}

		err := app.DB.UpdateOne(
			ctx,
			moderatorAppsCollection,
			bson.M{"id": id},
			bson.M{
				"$set": bson.M{
					"status":    "rejected",
					"updatedat": time.Now().UTC(),
				},
			},
		)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, map[string]string{
				"error": "Application not found or update failed",
			})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.RejectedModeratorRoleRequestPayload{
			ApplicationID: id,
			RejectedAt:    time.Now().UTC(),
		})
		_ = app.MQ.Publish(ctx, mqevent.RejectedModeratorRoleRequestEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Application rejected successfully",
		})
	}
}
