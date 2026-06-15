package reports

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/infra"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func normalizeAppealStatus(status string) string {
	status = strings.ToLower(stringTrim(status))
	if status == "rejected" {
		return "denied"
	}
	return status
}

/* -------------------------
   Appeals
------------------------- */

func CreateAppeal(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		var payload CreateAppealPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := getActorID(r)
		payload.TargetType = stringTrim(payload.TargetType)
		payload.TargetID = stringTrim(payload.TargetID)
		payload.Reason = stringTrim(payload.Reason)

		if userID == "" || payload.TargetType == "" || payload.TargetID == "" || payload.Reason == "" {
			writeError(w, "Missing required field", http.StatusBadRequest)
			return
		}

		filter := bson.M{
			"userId":     userID,
			"targetType": payload.TargetType,
			"targetId":   payload.TargetID,
			"status":     bson.M{"$in": []string{"pending", "submitted"}},
		}

		var existing bson.M
		if err := app.DB.FindOne(ctx, appealsCollection, filter, &existing); err == nil {
			writeError(w, "You already have a pending appeal for this content", http.StatusConflict)
			return
		}

		now := time.Now().UTC()
		appealID := utils.GenerateRandomString(17)

		appeal := bson.M{
			"appealid":    appealID,
			"userId":      userID,
			"targetType":  payload.TargetType,
			"targetId":    payload.TargetID,
			"reason":      payload.Reason,
			"status":      "pending",
			"reviewedBy":  "",
			"reviewNotes": "",
			"createdAt":   now,
			"updatedAt":   now,
		}

		if err := app.DB.Insert(ctx, appealsCollection, appeal); err != nil {
			writeError(w, "Failed to create appeal", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{
			"message":  "Appeal submitted",
			"appealId": appealID,
		})
	}
}

func UpdateAppeal(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		appealID := stringTrim(ps.ByName("id"))
		if appealID == "" {
			writeError(w, "Missing appeal ID", http.StatusBadRequest)
			return
		}

		var payload UpdateAppealPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		payload.Status = normalizeAppealStatus(payload.Status)
		payload.ReviewNotes = stringTrim(payload.ReviewNotes)

		if payload.Status != "approved" && payload.Status != "denied" {
			writeError(w, "Invalid status", http.StatusBadRequest)
			return
		}

		var appeal bson.M
		if err := app.DB.FindOne(ctx, appealsCollection, bson.M{"appealid": appealID}, &appeal); err != nil {
			writeError(w, "Appeal not found", http.StatusNotFound)
			return
		}

		if err := app.DB.Update(
			ctx,
			appealsCollection,
			bson.M{"appealid": appealID},
			bson.M{
				"status":      payload.Status,
				"reviewedBy":  getActorID(r),
				"reviewNotes": payload.ReviewNotes,
				"updatedAt":   time.Now().UTC(),
			},
		); err != nil {
			writeError(w, "Failed to update appeal", http.StatusInternalServerError)
			return
		}

		if payload.Status == "approved" {
			targetType, _ := appeal["targetType"].(string)
			targetID, _ := appeal["targetId"].(string)
			if targetType == "" || targetID == "" {
				writeError(w, "Appeal target is invalid", http.StatusInternalServerError)
				return
			}

			if err := setEntityDeletedFlag(
				ctx,
				targetType,
				targetID,
				false,
				getActorID(r),
				app,
			); err != nil {
				writeError(w, "Failed to restore content for approved appeal", http.StatusInternalServerError)
				return
			}
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Appeal updated"})
	}
}

func GetAppeals(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		q := r.URL.Query()

		status := normalizeAppealStatus(q.Get("status"))
		filter := bson.M{}
		if status == "" {
			status = "pending"
		}
		if status != "all" {
			filter["status"] = status
		}

		limit := int64(20)
		offset := int64(0)

		if l := stringTrim(q.Get("limit")); l != "" {
			if v, err := strconv.ParseInt(l, 10, 64); err == nil && v > 0 {
				limit = v
			}
		}
		if o := stringTrim(q.Get("offset")); o != "" {
			if v, err := strconv.ParseInt(o, 10, 64); err == nil && v >= 0 {
				offset = v
			}
		}

		var appeals []bson.M
		if err := app.DB.FindMany(ctx, appealsCollection, filter, &appeals); err != nil {
			writeError(w, "Failed to fetch appeals", http.StatusInternalServerError)
			return
		}

		utils.SortAndSlice(
			&appeals,
			bson.D{{Key: "createdAt", Value: -1}},
			offset,
			limit,
		)

		if appeals == nil {
			appeals = []bson.M{}
		}

		writeJSON(w, http.StatusOK, appeals)
	}
}
