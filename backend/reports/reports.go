package reports

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* -------------------------
   Helpers
------------------------- */

func stringTrim(s string) string { return strings.TrimSpace(s) }

func getActorID(r *http.Request) string {
	return utils.GetUserIDFromRequest(r)
}

// func utils.RespondWithJSON(w http.ResponseWriter, v interface{}, status int) {
// 	w.Header().Set("Content-Type", "application/json")
// 	if status > 0 {
// 		w.WriteHeader(status)
// 	}
// 	_ = json.NewEncoder(w).Encode(v)
// }

// func utils.RespondWithError(w http.ResponseWriter, msg string, status int) {
// 	utils.RespondWithJSON(w, map[string]string{"error": msg}, status)
// }

func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := stringTrim(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

/* -------------------------
   Payload Types
------------------------- */

type UpdateReportPayload struct {
	Status      string `json:"status"`
	ReviewNotes string `json:"reviewNotes,omitempty"`
}

type CreateAppealPayload struct {
	UserID     string `json:"userId"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	Reason     string `json:"reason"`
}

type UpdateAppealPayload struct {
	Status      string `json:"status"`
	ReviewNotes string `json:"reviewNotes,omitempty"`
}

/* -------------------------
   1) Submit Report
------------------------- */

func ReportContent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		var payload models.Report
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON payload")
			return
		}

		payload.ReportedBy = utils.GetUserIDFromRequest(r)
		payload.TargetID = stringTrim(payload.TargetID)
		payload.TargetType = stringTrim(payload.TargetType)
		payload.Reason = stringTrim(payload.Reason)
		payload.Notes = stringTrim(payload.Notes)
		payload.ParentType = stringTrim(payload.ParentType)
		payload.ParentID = stringTrim(payload.ParentID)

		if payload.ReportedBy == "" || payload.TargetID == "" || payload.TargetType == "" || payload.Reason == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing required field")
			return
		}

		filter := bson.M{
			"reportedBy": payload.ReportedBy,
			"targetType": payload.TargetType,
			"targetId":   payload.TargetID,
		}

		var existing models.Report
		if err := app.DB.FindOne(ctx, reportsCollection, filter, &existing); err == nil {
			utils.RespondWithError(w, http.StatusConflict, "You have already reported this item")
			return
		}

		now := time.Now().UTC()
		payload.ReportID = utils.GenerateRandomString(17)
		payload.Status = "pending"
		payload.CreatedAt = now
		payload.UpdatedAt = now
		payload.Notified = false

		if err := app.DB.Insert(ctx, reportsCollection, payload); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to save report")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, map[string]string{
			"message":  "Report submitted",
			"reportId": payload.ReportID,
		})
	}
}

/* -------------------------
   2) Get Reports
------------------------- */

func GetReports(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		q := r.URL.Query()
		filter := bson.M{}

		if status := stringTrim(q.Get("status")); status != "" && status != "all" {
			parts := splitAndTrim(status)
			if len(parts) == 1 {
				filter["status"] = parts[0]
			} else {
				filter["status"] = bson.M{"$in": parts}
			}
		} else if status == "" {
			filter["status"] = bson.M{"$nin": []string{"resolved", "rejected"}}
		}

		if tt := stringTrim(q.Get("targetType")); tt != "" && tt != "all" {
			filter["targetType"] = tt
		}

		if reason := stringTrim(q.Get("reason")); reason != "" && reason != "all" {
			filter["reason"] = bson.M{"$in": splitAndTrim(reason)}
		}

		if rb := stringTrim(q.Get("reportedBy")); rb != "" && rb != "all" {
			filter["reportedBy"] = rb
		}

		limit := int64(10)
		offset := int64(0)

		if v, err := strconv.ParseInt(q.Get("limit"), 10, 64); err == nil && v > 0 {
			if v > 200 {
				limit = 200
			} else {
				limit = v
			}
		}
		if v, err := strconv.ParseInt(q.Get("offset"), 10, 64); err == nil && v >= 0 {
			offset = v
		}

		var reports []models.Report
		if err := app.DB.FindMany(ctx, reportsCollection, filter, &reports); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch reports")
			return
		}

		utils.SortAndSlice(
			&reports,
			bson.D{{Key: "createdAt", Value: -1}},
			offset,
			limit,
		)

		utils.RespondWithJSON(w, http.StatusOK, reports)
	}
}

/* -------------------------
   3) Update Report
------------------------- */

func UpdateReport(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		reportID := stringTrim(ps.ByName("id"))
		if reportID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing report ID")
			return
		}

		var payload UpdateReportPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON payload")
			return
		}

		payload.Status = stringTrim(payload.Status)
		payload.ReviewNotes = stringTrim(payload.ReviewNotes)

		if payload.Status == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing required field: status")
			return
		}

		err := app.DB.Update(
			ctx,
			reportsCollection,
			bson.M{"reportid": reportID},
			bson.M{
				"status":      payload.Status,
				"reviewedBy":  getActorID(r),
				"reviewNotes": payload.ReviewNotes,
				"updatedAt":   time.Now().UTC(),
				"notified":    payload.Status != "resolved",
			},
		)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update report")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Report updated"})
	}
}

/* -------------------------
   Appeals
------------------------- */

func CreateAppeal(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		var payload CreateAppealPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON payload")
			return
		}

		payload.UserID = stringTrim(payload.UserID)
		payload.TargetType = stringTrim(payload.TargetType)
		payload.TargetID = stringTrim(payload.TargetID)
		payload.Reason = stringTrim(payload.Reason)

		if payload.UserID == "" || payload.TargetType == "" || payload.TargetID == "" || payload.Reason == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing required field")
			return
		}

		filter := bson.M{
			"userId":     payload.UserID,
			"targetType": payload.TargetType,
			"targetId":   payload.TargetID,
			"status":     bson.M{"$in": []string{"pending", "submitted"}},
		}

		var existing bson.M
		if err := app.DB.FindOne(ctx, appealsCollection, filter, &existing); err == nil {
			utils.RespondWithError(w, http.StatusConflict, "You already have a pending appeal for this content")
			return
		}

		now := time.Now().UTC()
		appealID := utils.GenerateRandomString(17)

		appeal := bson.M{
			"appealid":    appealID,
			"userId":      payload.UserID,
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
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create appeal")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusCreated, map[string]string{
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
			utils.RespondWithError(w, http.StatusBadRequest, "Missing appeal ID")
			return
		}

		var payload UpdateAppealPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON payload")
			return
		}

		payload.Status = stringTrim(payload.Status)
		payload.ReviewNotes = stringTrim(payload.ReviewNotes)

		if payload.Status != "approved" && payload.Status != "denied" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid status")
			return
		}

		var appeal bson.M
		if err := app.DB.FindOne(ctx, appealsCollection, bson.M{"appealid": appealID}, &appeal); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Appeal not found")
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
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update appeal")
			return
		}

		if payload.Status == "approved" {
			_ = setEntityDeletedFlag(
				ctx,
				appeal["targetType"].(string),
				appeal["targetId"].(string),
				false,
				getActorID(r),
				app,
			)
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Appeal updated"})
	}
}

/* -------------------------
   Soft Delete
------------------------- */

var errEntityNotFound = errors.New("entity not found")

func setEntityDeletedFlag(
	ctx context.Context,
	entityType string,
	id string,
	deleted bool,
	by string,
	app *infra.Deps,
) error {
	now := time.Now().UTC()

	var collection string
	var idField string

	switch entityType {
	case "post":
		collection = "posts"
		idField = "postid"
	case "place":
		collection = "places"
		idField = "placeid"
	case "event":
		collection = "events"
		idField = "eventid"
	case "user":
		collection = "users"
		idField = "userid"
	case "merch":
		collection = "merch"
		idField = "merchid"
	case "message":
		collection = "messages"
		idField = "messageid"
	case "chat":
		collection = "chats"
		idField = "chatid"
	case "comment":
		collection = "comments"
		idField = "commentid"
	default:
		return errors.New("unsupported entity type")
	}

	err := app.DB.Update(
		ctx,
		collection,
		bson.M{idField: id},
		bson.M{
			"deleted":   deleted,
			"deletedBy": by,
			"deletedAt": func() interface{} {
				if deleted {
					return now
				}
				return ""
			}(),
		},
	)
	if err != nil {
		return err
	}

	return nil
}

/* -------------------------
   SoftDeleteEntity
------------------------- */

func SoftDeleteEntity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		entityType := stringTrim(ps.ByName("type"))
		idParam := stringTrim(ps.ByName("id"))

		if entityType == "" || idParam == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing type or id")
			return
		}

		moderatorID := getActorID(r)
		if moderatorID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Missing moderator id in context")
			return
		}

		if err := setEntityDeletedFlag(ctx, entityType, idParam, true, moderatorID, app); err != nil {
			if errors.Is(err, errEntityNotFound) {
				utils.RespondWithError(w, http.StatusNotFound, "Entity not found")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to soft-delete entity")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Entity soft-deleted"})
	}
}
