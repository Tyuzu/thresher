package deliveries

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

type Delivery struct {
	DeliveryID    string    `json:"deliveryid" bson:"deliveryid"`
	OrderID       string    `json:"orderid,omitempty" bson:"orderid,omitempty"`
	Status        string    `json:"status" bson:"status"`
	Pickup        string    `json:"pickup" bson:"pickup"`
	Dropoff       string    `json:"dropoff" bson:"dropoff"`
	PackageName   string    `json:"packageName,omitempty" bson:"packageName,omitempty"`
	Weight        string    `json:"weight,omitempty" bson:"weight,omitempty"`
	Distance      string    `json:"distance,omitempty" bson:"distance,omitempty"`
	ETA           string    `json:"eta,omitempty" bson:"eta,omitempty"`
	Reward        int64     `json:"reward,omitempty" bson:"reward,omitempty"`
	UpdatedAt     string    `json:"updatedAt,omitempty" bson:"updatedAt,omitempty"`
	CustomerName  string    `json:"customerName,omitempty" bson:"customerName,omitempty"`
	CustomerPhone string    `json:"customerPhone,omitempty" bson:"customerPhone,omitempty"`
	Notes         string    `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt     time.Time `json:"createdAt" bson:"createdAt"`
}

func GetMyDeliveries(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var orders []models.Order
		if err := app.DB.FindMany(ctx, "orders", bson.M{"userId": userID}, &orders); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch deliveries")
			return
		}

		deliveries := make([]Delivery, 0, len(orders))
		for _, order := range orders {
			deliveries = append(deliveries, buildDeliveryFromOrder(order))
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"deliveries": deliveries})
	}
}

func GetDeliveryByID(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		id := strings.TrimSpace(ps.ByName("deliveryid"))
		if id == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid delivery id")
			return
		}

		var order models.Order
		if err := app.DB.FindOne(ctx, "orders", bson.M{"orderId": id, "userId": userID}, &order); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Delivery not found")
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, buildDeliveryFromOrder(order))
	}
}

func buildDeliveryFromOrder(order models.Order) Delivery {
	pickup, dropoff := parseAddress(order.Address)
	status := normalizeStatus(order.Status)
	return Delivery{
		DeliveryID:   order.OrderID,
		OrderID:      order.OrderID,
		Status:       status,
		Pickup:       pickup,
		Dropoff:      dropoff,
		PackageName:  "Order shipment",
		Weight:       "1 kg",
		Distance:     "5 km",
		ETA:          "20 min",
		Reward:       order.Total / 10,
		UpdatedAt:    order.CreatedAt.Format(time.RFC3339),
		CustomerName: order.UserID,
		CreatedAt:    order.CreatedAt,
	}
}

func normalizeStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "paid", "completed", "delivered":
		return "Delivered"
	case "pending", "processing", "accepted":
		return "Pending"
	case "in_progress", "inprogress", "shipping":
		return "In Progress"
	default:
		return "Pending"
	}
}

func parseAddress(raw string) (string, string) {
	parts := strings.Split(raw, "->")
	if len(parts) == 2 {
		return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
	}

	parts = strings.Split(raw, "-")
	if len(parts) == 2 {
		return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
	}

	return raw, raw
}
