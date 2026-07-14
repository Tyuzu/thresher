package farms

import (
	"encoding/json"
	log "naevis/utils/logger"
	"net/http"
	"strings"
	"time"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/metrics/auditlog"
	"naevis/middleware"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// --------------------------------------------------
// Create
// --------------------------------------------------

func CreateFarm(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		r.Body = http.MaxBytesReader(nil, r.Body, 50<<20)

		if err := r.ParseMultipartForm(50 << 20); err != nil {
			log.Printf("Farm creation: form parse error from %s: %v", r.RemoteAddr, err)

			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Invalid form data",
			})
			return
		}

		requestingUserID := utils.GetUserIDFromRequest(r)

		name := strings.TrimSpace(r.FormValue("name"))
		location := strings.TrimSpace(r.FormValue("location"))
		description := strings.TrimSpace(r.FormValue("description"))
		owner := strings.TrimSpace(r.FormValue("owner"))
		contact := strings.TrimSpace(r.FormValue("contact"))
		social := strings.TrimSpace(r.FormValue("social"))
		practice := strings.TrimSpace(r.FormValue("practice"))

		availabilityJSON := strings.TrimSpace(r.FormValue("availability"))

		availability := models.WeeklyAvailability{}

		if availabilityJSON != "" {
			if err := json.Unmarshal([]byte(availabilityJSON), &availability); err != nil {
				utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
					"success": false,
					"message": "Invalid availability",
				})
				return
			}
		}

		if name == "" || location == "" || owner == "" || contact == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Missing required fields",
			})
			return
		}

		if !middleware.ValidatePhone(contact) && !middleware.ValidateEmail(contact) {
			log.Printf("Farm creation: invalid contact format from user %s: %s", requestingUserID, contact)

			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Invalid contact format. Provide valid email or phone number",
			})
			return
		}

		if len(name) > 200 || len(location) > 500 || len(description) > 2000 {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Field values too long",
			})
			return
		}

		farm := models.Farm{
			FarmID:       utils.GenerateRandomString(14),
			Name:         name,
			Location:     location,
			Description:  description,
			Owner:        owner,
			Contact:      contact,
			Availability: availability,
			Social:       social,
			Practice:     practice,
			Crops:        []models.Crop{},
			CreatedBy:    requestingUserID,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := insertFarm(ctx, app.DB, farm); err != nil {
			log.Printf("Farm creation failed for user %s: %v", requestingUserID, err)

			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to create farm",
			})
			return
		}

		go auditlog.LogAction(
			ctx,
			app,
			r,
			requestingUserID,
			models.AuditActionFarmCreate,
			"farm",
			farm.FarmID,
			"success",
			map[string]interface{}{
				"name":     farm.Name,
				"location": farm.Location,
			},
		)

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.FarmCreatedEvent, mqevent.FarmCreatedPayload{}); err != nil {
			log.Printf("failed to publish farm created event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"id":      farm.FarmID,
		})
	}
}

// --------------------------------------------------
// Edit
// --------------------------------------------------
func EditFarm(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		farmID := ps.ByName("id")

		if farmID == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Missing farm id",
			})
			return
		}

		userID, ok := ctx.Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			utils.RespondWithJSON(w, http.StatusUnauthorized, utils.M{
				"success": false,
				"message": "Unauthorized",
			})
			return
		}

		farm, err := getFarmByID(ctx, app.DB, farmID)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, utils.M{
				"success": false,
				"message": "Farm not found",
			})
			return
		}

		if farm.CreatedBy != userID {
			utils.RespondWithJSON(w, http.StatusForbidden, utils.M{
				"success": false,
				"message": "You can only edit your own farm",
			})
			return
		}

		update := bson.M{}
		contentType := r.Header.Get("Content-Type")

		var input models.Farm

		if strings.HasPrefix(contentType, "multipart/form-data") {
			r.Body = http.MaxBytesReader(nil, r.Body, 10<<20)

			if err := r.ParseMultipartForm(10 << 20); err != nil {
				utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
					"success": false,
					"message": "Malformed multipart data",
				})
				return
			}

			input.Name = strings.TrimSpace(r.FormValue("name"))
			input.Location = strings.TrimSpace(r.FormValue("location"))
			input.Description = strings.TrimSpace(r.FormValue("description"))
			input.Owner = strings.TrimSpace(r.FormValue("owner"))
			input.Contact = strings.TrimSpace(r.FormValue("contact"))
			input.Social = strings.TrimSpace(r.FormValue("social"))
			input.Practice = strings.TrimSpace(r.FormValue("practice"))

			availabilityJSON := strings.TrimSpace(r.FormValue("availability"))

			if availabilityJSON != "" {
				if err := json.Unmarshal([]byte(availabilityJSON), &input.Availability); err != nil {
					utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
						"success": false,
						"message": "Invalid availability",
					})
					return
				}
			}
		} else {
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
					"success": false,
					"message": "Invalid JSON body",
				})
				return
			}
		}

		if input.Name != "" {
			update["name"] = input.Name
		}

		if input.Location != "" {
			update["location"] = input.Location
		}

		if input.Description != "" {
			update["description"] = input.Description
		}

		if input.Owner != "" {
			update["owner"] = input.Owner
		}

		if input.Contact != "" {
			update["contact"] = input.Contact
		}

		if input.Social != "" {
			update["social"] = input.Social
		}

		if input.Practice != "" {
			update["practice"] = input.Practice
		}

		if input.Availability != nil {
			update["availability"] = input.Availability
		}

		if len(update) == 0 {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "No fields to update",
			})
			return
		}

		update["updatedAt"] = time.Now()

		if err := updateOwnedFarm(
			ctx,
			app.DB,
			farmID,
			userID,
			bson.M{
				"$set": update,
			},
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Database error",
			})
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.FarmUpdatedEvent, mqevent.FarmUpdatedPayload{}); err != nil {
			log.Printf("failed to publish farm updated event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"message": "Farm updated",
		})
	}
}

// --------------------------------------------------
// Delete
// --------------------------------------------------

func DeleteFarm(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		farmID := ps.ByName("id")

		if farmID == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Missing farm id",
			})
			return
		}

		if _, ok := ctx.Value(config.UserIDKey).(string); !ok {
			http.Error(w, "Invalid user", http.StatusBadRequest)
			return
		}

		if _, err := deleteFarmByID(ctx, app.DB, farmID); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
			})
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.FarmDeletedEvent, mqevent.FarmDeletedPayload{}); err != nil {
			log.Printf("failed to publish farm deleted event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
		})
	}
}
