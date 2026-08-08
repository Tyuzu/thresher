package deliveries

import (
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"naevis/infra"
)

type Webhook struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TenantID  string             `bson:"tenant_id" json:"tenant_id"`
	URL       string             `bson:"url" json:"url"`
	Events    []string           `bson:"events" json:"events"`
	Secret    string             `bson:"secret" json:"secret"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

func CreateWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var wh Webhook
		if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid body")
			return
		}

		wh.ID = primitive.NewObjectID()
		wh.TenantID = r.Header.Get("X-Tenant-ID")
		wh.CreatedAt = time.Now()

		ctx := r.Context()
		if err := app.DB.InsertOne(ctx, "webhooks", wh); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to create webhook")
			return
		}
		respondJSON(w, http.StatusCreated, wh)
	}
}

func ListWebhooks(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := r.Header.Get("X-Tenant-ID")
		ctx := r.Context()

		var webhooks []Webhook
		if err := app.DB.FindMany(ctx, "webhooks", bson.M{"tenant_id": tenantID}, &webhooks); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to list webhooks")
			return
		}
		respondJSON(w, http.StatusOK, webhooks)
	}
}

func GetWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := getPathParam(r, "webhookid")
		ctx := r.Context()

		objID, _ := primitive.ObjectIDFromHex(whID)
		var wh Webhook
		if err := app.DB.FindOne(ctx, "webhooks", bson.M{"_id": objID}, &wh); err != nil {
			respondError(w, http.StatusNotFound, "Webhook not found")
			return
		}
		respondJSON(w, http.StatusOK, wh)
	}
}

func UpdateWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := getPathParam(r, "webhookid")
		var updates bson.M
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid payload")
			return
		}

		ctx := r.Context()
		objID, _ := primitive.ObjectIDFromHex(whID)
		delete(updates, "_id")

		if _, err := app.DB.UpdateOne(ctx, "webhooks", bson.M{"_id": objID}, bson.M{"$set": updates}); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to update webhook")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}
}

func DeleteWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := getPathParam(r, "webhookid")
		ctx := r.Context()

		objID, _ := primitive.ObjectIDFromHex(whID)
		count, err := app.DB.DeleteOne(ctx, "webhooks", bson.M{"_id": objID})
		if err != nil || count == 0 {
			respondError(w, http.StatusNotFound, "Webhook not found or failed to delete")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

func TestWebhook(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		whID := getPathParam(r, "webhookid")

		// Emit test event via NATS worker queue for asynchronous ping execution
		payload := map[string]string{"event": "ping", "webhook_id": whID}
		data, _ := json.Marshal(payload)
		_ = app.NatsConn.Publish("webhooks.test", data)

		respondJSON(w, http.StatusOK, map[string]string{"status": "test_triggered"})
	}
}
