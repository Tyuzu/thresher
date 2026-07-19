package merch

import (
	"encoding/json"
	log "naevis/utils/logger"
	"net/http"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/stripe"
	"naevis/userdata"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

// POST /merch/event/:eventId/:merchId/payment-session
func CreateMerchPaymentSession(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		merchID := ps.ByName("merchid")
		eventID := ps.ByName("eventid")

		var body struct {
			Quantity int `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Quantity < 1 {
			http.Error(w, "Invalid request or quantity", http.StatusBadRequest)
			return
		}

		session, err := stripe.CreateMerchSession(merchID, eventID, body.Quantity)
		if err != nil {
			log.Printf("Error creating payment session: %v", err)
			http.Error(w, "Failed to create payment session", http.StatusInternalServerError)
			return
		}

		response := map[string]any{
			"success": true,
			"data": map[string]any{
				"paymentUrl": session.URL,
				"eventId":    session.EventID,
				"merchId":    session.MerchID,
				"quantity":   session.Stock,
			},
		}

		mqpayload, _ := json.Marshal(mqevent.MerchPaymentSessionCreatedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.MerchPaymentSessionCreatedEvent, mqpayload); err != nil { // #nosec G104
			log.Printf("failed to publish merch payment session created event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, response)
	}
}

// POST /merch/event/:eventId/:merchId/confirm-purchase
func ConfirmMerchPurchase(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		var body struct {
			Quantity int     `json:"quantity"`
			Price    float64 `json:"price,omitempty"` // Optional, will be verified against DB
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Quantity < 1 {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		eventID := ps.ByName("eventid")
		merchID := ps.ByName("merchid")

		userID, ok := ctx.Value(config.UserIDKey).(string)
		if !ok || userID == "" {
			http.Error(w, "Invalid user", http.StatusUnauthorized)
			return
		}

		// SECURITY: First lookup current merch details to verify price
		var currentMerch models.Merch
		if err := app.DB.FindOne(
			ctx,
			merchCollection,
			bson.M{
				"entity_id": eventID,
				"merchid":   merchID,
			},
			&currentMerch,
		); err != nil {
			http.Error(w, "Merch not found", http.StatusNotFound)
			return
		}

		// Verify price matches current database price (with small tolerance for floating point)
		if body.Price > 0 {
			priceDiff := currentMerch.Price - body.Price
			if priceDiff < -0.01 || priceDiff > 0.01 { // Allow 1 paise tolerance
				http.Error(w, "Price mismatch. Please refresh and try again", http.StatusConflict)
				return
			}
		}

		// Check stock availability
		if currentMerch.Stock < body.Quantity {
			http.Error(w, "Not enough merch available", http.StatusBadRequest)
			return
		}

		// Atomically decrement stock and return updated document
		var updatedMerch models.Merch
		err := app.DB.FindOneAndUpdate(
			ctx,
			merchCollection,
			bson.M{
				"entity_id": eventID,
				"merchid":   merchID,
				"stock":     bson.M{"$gte": body.Quantity},
			},
			bson.M{
				"$inc": bson.M{"stock": -body.Quantity},
			},
			&updatedMerch,
		)
		if err != nil {
			http.Error(w, "Not enough merch available", http.StatusBadRequest)
			return
		}

		// Record purchase
		userdata.SetUserData(
			"merch",
			updatedMerch.MerchID,
			userID,
			updatedMerch.EntityType,
			updatedMerch.EntityID,
			app,
		)

		resp := map[string]any{
			"success": true,
			"data": map[string]any{
				"message":        "Merch purchased successfully",
				"merchId":        updatedMerch.MerchID,
				"eventId":        updatedMerch.EntityID,
				"quantityBought": body.Quantity,
				"remainingStock": updatedMerch.Stock,
				"unitPrice":      currentMerch.Price,
			},
		}

		mqpayload, _ := json.Marshal(mqevent.MerchPurchaseConfirmedPayload{})
		if err := app.MQ.Publish(ctx, mqevent.MerchPurchaseConfirmedEvent, mqpayload); err != nil { // #nosec G104
			log.Printf("failed to publish merch purchase confirmed event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, resp)
	}
}
