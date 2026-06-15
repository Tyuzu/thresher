package reports

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* -------------------------
   1) Submit Report
------------------------- */

func ReportContent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		var payload models.Report
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, "Invalid JSON payload", http.StatusBadRequest)
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
			writeError(w, "Missing required field", http.StatusBadRequest)
			return
		}

		filter := bson.M{
			"reportedBy": payload.ReportedBy,
			"targetType": payload.TargetType,
			"targetId":   payload.TargetID,
		}

		var existing models.Report
		if err := app.DB.FindOne(ctx, reportsCollection, filter, &existing); err == nil {
			writeError(w, "You have already reported this item", http.StatusConflict)
			return
		}

		now := time.Now().UTC()
		payload.ReportID = utils.GenerateRandomString(17)
		payload.Status = "pending"
		payload.CreatedAt = now
		payload.UpdatedAt = now
		payload.Notified = false

		if err := app.DB.Insert(ctx, reportsCollection, payload); err != nil {
			writeError(w, "Failed to save report", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{
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

		status := stringTrim(q.Get("status"))
		if status != "" && status != "all" {
			parts := splitAndTrim(status)
			if len(parts) == 1 {
				filter["status"] = parts[0]
			} else if len(parts) > 1 {
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
			writeError(w, "Failed to fetch reports", http.StatusInternalServerError)
			return
		}

		utils.SortAndSlice(
			&reports,
			bson.D{{Key: "createdAt", Value: -1}},
			offset,
			limit,
		)

		if reports == nil {
			reports = []models.Report{}
		}

		writeJSON(w, http.StatusOK, reports)
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
			writeError(w, "Missing report ID", http.StatusBadRequest)
			return
		}

		var payload UpdateReportPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		payload.Status = stringTrim(payload.Status)
		payload.ReviewNotes = stringTrim(payload.ReviewNotes)

		allowed := map[string]struct{}{
			"pending":  {},
			"reviewed": {},
			"resolved": {},
			"rejected": {},
		}
		if _, ok := allowed[payload.Status]; !ok {
			writeError(w, "Invalid status", http.StatusBadRequest)
			return
		}

		if err := app.DB.Update(
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
		); err != nil {
			writeError(w, "Failed to update report", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Report updated"})
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
		collection = config.Collections.BlogPostsCollection
		idField = "postid"
	case "place":
		collection = config.Collections.PlacesCollection
		idField = "placeid"
	case "event":
		collection = config.Collections.EventsCollection
		idField = "eventid"
	case "user":
		collection = config.Collections.UserCollection
		idField = "userid"
	case "merch":
		collection = config.Collections.MerchCollection
		idField = "merchid"
	case "message":
		collection = config.Collections.MessagesCollection
		idField = "messageid"
	case "chat":
		collection = config.Collections.ChatsCollection
		idField = "chatid"
	case "comment":
		collection = config.Collections.CommentsCollection
		idField = "commentid"
	default:
		return errors.New("unsupported entity type")
	}

	var existing bson.M
	if err := app.DB.FindOne(ctx, collection, bson.M{idField: id}, &existing); err != nil {
		return errEntityNotFound
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
			writeError(w, "Missing type or id", http.StatusBadRequest)
			return
		}

		moderatorID := getActorID(r)
		if moderatorID == "" {
			writeError(w, "Missing moderator id in context", http.StatusUnauthorized)
			return
		}

		if err := setEntityDeletedFlag(ctx, entityType, idParam, true, moderatorID, app); err != nil {
			if errors.Is(err, errEntityNotFound) {
				writeError(w, "Entity not found", http.StatusNotFound)
				return
			}
			writeError(w, "Failed to soft-delete entity", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Entity soft-deleted"})
	}
}
