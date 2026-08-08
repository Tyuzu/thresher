package delwebhooks

import (
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/internal/deliveries"
	"naevis/utils"
)

func CreateWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var wh deliveries.Webhook
		if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid body")
			return
		}

		wh.WebhookID = utils.GenerateRandomString(18)
		wh.TenantID = deliveries.GetTenantIDFromContext(r.Context())
		wh.CreatedAt = time.Now()

		ctx := r.Context()
		if err := app.DB.InsertOne(ctx, "webhooks", wh); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create webhook")
			return
		}
		utils.RespondWithJSON(w, http.StatusCreated, wh)
	}
}

func ListWebhooks(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var webhooks []deliveries.Webhook
		if err := app.DB.FindMany(ctx, "webhooks", bson.M{"tenant_id": tenantID}, &webhooks); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to list webhooks")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, webhooks)
	}
}

func GetWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := utils.GetParam(r, "webhookid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		var wh deliveries.Webhook
		filter := bson.M{"_id": whID, "tenant_id": tenantID}
		if err := app.DB.FindOne(ctx, "webhooks", filter, &wh); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Webhook not found")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, wh)
	}
}

func UpdateWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := utils.GetParam(r, "webhookid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())

		var updates bson.M
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid payload")
			return
		}

		ctx := r.Context()
		delete(updates, "_id")
		delete(updates, "tenant_id")

		filter := bson.M{"_id": whID, "tenant_id": tenantID}
		if _, err := app.DB.UpdateOne(ctx, "webhooks", filter, bson.M{"$set": updates}); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update webhook")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}
}

func DeleteWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := utils.GetParam(r, "webhookid")
		tenantID := deliveries.GetTenantIDFromContext(r.Context())
		ctx := r.Context()

		filter := bson.M{"_id": whID, "tenant_id": tenantID}
		count, err := app.DB.DeleteOne(ctx, "webhooks", filter)
		if err != nil || count == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "Webhook not found or failed to delete")
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

func TestWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := utils.GetParam(r, "webhookid")

		payload := map[string]string{"event": "ping", "webhook_id": whID}
		data, _ := json.Marshal(payload)
		_ = app.NatsConn.Publish("webhooks.test", data)

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "test_triggered"})
	}
}
