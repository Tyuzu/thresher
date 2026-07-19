package merch

import (
	"context"
	"encoding/json"
	"errors"
	log "naevis/utils/logger"
	"net/http"
	"time"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/metrics/auditlog"
	"naevis/models"
	"naevis/userdata"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func validateEntityType(t string) bool {
	return t == "event" || t == "farm" || t == "artist"
}

// ---------------------- Create Merch ----------------------
func CreateMerch(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		entityType := ps.ByName("entityType")
		eventID := ps.ByName("eventid")

		if !validateEntityType(entityType) {
			utils.RespondWithJSON(w, 400, map[string]any{"success": false, "error": "invalid entity type"})
			return
		}

		// SECURITY: Verify user is authenticated
		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			utils.RespondWithJSON(w, 401, map[string]any{"success": false, "error": "unauthorized"})
			return
		}

		// SECURITY: Verify user is the owner of the entity
		collection := ""
		idField := ""
		ownerField := ""

		switch entityType {
		case "event":
			collection = "events"
			idField = "eventid"
			ownerField = "creatorid"
		case "farm":
			collection = "farms"
			idField = "farmid"
			ownerField = "createdBy"
		case "artist":
			collection = "artists"
			idField = "artistid"
			ownerField = "creatorid"
		}

		if collection != "" {
			var ownerEntity bson.M
			err := app.DB.FindOne(r.Context(), collection, bson.M{
				idField: eventID,
			}, &ownerEntity)

			if err != nil {
				utils.RespondWithJSON(w, 404, map[string]any{"success": false, "error": "entity not found"})
				return
			}

			// Check ownership based on entity type
			owner, ok := ownerEntity[ownerField].(string)
			if !ok {
				utils.RespondWithJSON(w, 403, map[string]any{"success": false, "error": "cannot verify ownership"})
				return
			}

			if owner != userID {
				utils.RespondWithJSON(w, 403, map[string]any{"success": false, "error": "forbidden: only entity owner can create merch"})
				return
			}
		}

		var body struct {
			Name     string  `json:"name"`
			Price    float64 `json:"price"`
			Discount float64 `json:"discount"`
			Stock    int     `json:"stock"`
			Photo    string  `json:"merch_pic"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithJSON(w, 400, map[string]any{"success": false, "error": "invalid json"})
			return
		}

		if body.Name == "" || body.Price <= 0 || body.Stock < 0 {
			utils.RespondWithJSON(w, 400, map[string]any{"success": false, "error": "invalid merch data"})
			return
		}

		now := time.Now()
		merch := models.Merch{
			MerchID:    utils.GenerateRandomString(14),
			EntityType: entityType,
			EntityID:   eventID,
			Name:       body.Name,
			Price:      body.Price,
			Discount:   body.Discount,
			Stock:      body.Stock,
			MerchPhoto: body.Photo,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		if err := app.DB.Insert(r.Context(), merchCollection, merch); err != nil {
			utils.RespondWithJSON(w, 500, map[string]any{"success": false, "error": "insert failed"})
			return
		}

		// Log audit trail for merchandise creation
		auditlog.LogAction(
			r.Context(), app, r, userID,
			models.AuditActionMerchCreate,
			"merchandise", merch.MerchID, "success",
			map[string]interface{}{
				"name":        merch.Name,
				"price":       merch.Price,
				"stock":       merch.Stock,
				"entity_type": entityType,
				"entity_id":   eventID,
			},
		)

		mqpayload, _ := json.Marshal(mqevent.MerchCreatedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.MerchCreatedEvent, mqpayload); err != nil { // #nosec G104
			log.Printf("failed to publish merch created event: %v", err)
		}

		utils.RespondWithJSON(w, 201, map[string]any{"success": true, "data": merch})
	}
}

// ---------------------- Edit Merch ----------------------
func EditMerch(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		entityType := ps.ByName("entityType")
		eventID := ps.ByName("eventid")
		merchID := ps.ByName("merchid")

		// SECURITY: Verify user is authenticated
		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			utils.RespondWithJSON(w, 401, map[string]any{"success": false, "error": "unauthorized"})
			return
		}

		// SECURITY: Verify user is the owner of the entity
		collection := ""
		idField := ""
		ownerField := ""

		switch entityType {
		case "event":
			collection = "events"
			idField = "eventid"
			ownerField = "creatorid"
		case "farm":
			collection = "farms"
			idField = "farmid"
			ownerField = "createdBy"
		case "artist":
			collection = "artists"
			idField = "artistid"
			ownerField = "creatorid"
		}

		if collection != "" {
			var ownerEntity bson.M
			err := app.DB.FindOne(r.Context(), collection, bson.M{
				idField: eventID,
			}, &ownerEntity)

			if err != nil {
				utils.RespondWithJSON(w, 404, map[string]any{"success": false, "error": "entity not found"})
				return
			}

			owner, ok := ownerEntity[ownerField].(string)
			if !ok || owner != userID {
				utils.RespondWithJSON(w, 403, map[string]any{"success": false, "error": "forbidden: only entity owner can edit merch"})
				return
			}
		}

		var body struct {
			Name     *string  `json:"name"`
			Price    *float64 `json:"price"`
			Discount *float64 `json:"discount"`
			Stock    *int     `json:"stock"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithJSON(w, 400, map[string]any{"success": false, "error": "invalid json"})
			return
		}

		update := bson.M{
			"updatedat": time.Now(),
		}

		if body.Name != nil {
			update["name"] = *body.Name
		}
		if body.Price != nil && *body.Price > 0 {
			update["price"] = *body.Price
		}
		if body.Discount != nil {
			update["discount"] = *body.Discount
		}
		if body.Stock != nil && *body.Stock >= 0 {
			update["stock"] = *body.Stock
		}

		err := app.DB.UpdateOne(
			r.Context(),
			merchCollection,
			bson.M{
				"entity_type": entityType,
				"entity_id":   eventID,
				"merchid":     merchID,
			},
			bson.M{"$set": update},
		)
		if err != nil {
			utils.RespondWithJSON(w, 404, map[string]any{"success": false, "error": "merch not found"})
			return
		}

		// Log audit trail for merchandise update
		auditlog.LogAction(
			r.Context(), app, r, userID,
			models.AuditActionMerchUpdate,
			"merchandise", merchID, "success",
			map[string]interface{}{
				"updates": update,
			},
		)

		mqpayload, _ := json.Marshal(mqevent.MerchUpdatedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.MerchUpdatedEvent, mqpayload); err != nil { // #nosec G104
			log.Printf("failed to publish merch updated event: %v", err)
		}

		utils.RespondWithJSON(w, 200, map[string]any{"success": true})
	}
}

// ---------------------- Delete Merch ----------------------
func DeleteMerch(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		entityType := ps.ByName("entityType")
		eventID := ps.ByName("eventid")
		merchID := ps.ByName("merchid")

		// SECURITY: Verify user is authenticated
		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			utils.RespondWithJSON(w, 401, map[string]any{"success": false, "error": "unauthorized"})
			return
		}

		// SECURITY: Verify user is the owner of the entity
		collection := ""
		idField := ""
		ownerField := ""

		switch entityType {
		case "event":
			collection = "events"
			idField = "eventid"
			ownerField = "creatorid"
		case "farm":
			collection = "farms"
			idField = "farmid"
			ownerField = "createdBy"
		case "artist":
			collection = "artists"
			idField = "artistid"
			ownerField = "creatorid"
		}

		if collection != "" {
			var ownerEntity bson.M
			err := app.DB.FindOne(r.Context(), collection, bson.M{
				idField: eventID,
			}, &ownerEntity)

			if err != nil {
				utils.RespondWithJSON(w, 404, map[string]any{"success": false, "error": "entity not found"})
				return
			}

			owner, ok := ownerEntity[ownerField].(string)
			if !ok || owner != userID {
				utils.RespondWithJSON(w, 403, map[string]any{"success": false, "error": "forbidden: only entity owner can delete merch"})
				return
			}
		}

		// SECURITY: Use soft delete instead of hard delete
		now := time.Now()
		err := app.DB.UpdateOne(
			r.Context(),
			merchCollection,
			bson.M{
				"entity_type": entityType,
				"entity_id":   eventID,
				"merchid":     merchID,
				"deletedAt":   bson.M{"$exists": false}, // Only soft-delete if not already deleted
			},
			bson.M{"$set": bson.M{
				"deletedAt": now,
				"updatedat": now,
			}},
		)
		if err != nil {
			utils.RespondWithJSON(w, 404, map[string]any{"success": false, "error": "merch not found"})
			return
		}

		// Log audit trail for merchandise deletion
		auditlog.LogAction(
			r.Context(), app, r, userID,
			models.AuditActionMerchDelete,
			"merchandise", merchID, "success",
			map[string]interface{}{
				"deleted_at": now,
			},
		)

		mqpayload, _ := json.Marshal(mqevent.MerchDeletedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.MerchDeletedEvent, mqpayload); err != nil { // #nosec G104
			log.Printf("failed to publish merch deleted event: %v", err)
		}

		utils.RespondWithJSON(w, 200, map[string]any{"success": true})
	}
}

// ---------------------- Buy Merch ----------------------
func BuyMerch(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		userID, ok := r.Context().Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			utils.RespondWithJSON(w, 401, map[string]any{"success": false, "error": "unauthorized"})
			return
		}

		var body struct {
			Quantity int `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Quantity < 1 {
			utils.RespondWithJSON(w, 400, map[string]any{"success": false, "error": "invalid quantity"})
			return
		}

		err := app.DB.WithDB(r.Context(), func(ctx context.Context) error {
			var merch models.Merch
			err := app.DB.FindOne(ctx, merchCollection, bson.M{
				"entity_type": ps.ByName("entityType"),
				"entity_id":   ps.ByName("eventid"),
				"merchid":     ps.ByName("merchid"),
			}, &merch)
			if err != nil {
				return errors.New("merch not found")
			}

			if merch.Stock < body.Quantity {
				return errors.New("insufficient stock")
			}

			err = app.DB.UpdateOne(
				ctx,
				merchCollection,
				bson.M{"merchid": merch.MerchID},
				bson.M{"$inc": bson.M{"stock": -body.Quantity}},
			)
			if err != nil {
				return err
			}

			userdata.SetUserData(
				"merch",
				merch.MerchID,
				userID,
				merch.EntityType,
				merch.EntityID,
				app,
			)

			return nil
		})

		if err != nil {
			utils.RespondWithJSON(w, 400, map[string]any{"success": false, "error": err.Error()})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.MerchBoughtPayload{})
		if err := app.MQ.Publish(ctx, mqevent.MerchBoughtEvent, mqpayload); err != nil { // #nosec G104
			log.Printf("failed to publish merch bought event: %v", err)
		}

		utils.RespondWithJSON(w, 200, map[string]any{
			"success": true,
			"message": "purchase successful",
		})
	}
}
