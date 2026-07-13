package cart

import (
	"context"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"naevis/utils/logger"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* ───────────────────────── Get User Orders ───────────────────────── */

func GetMyOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse pagination parameters
		skip := 0
		limit := 10
		if s := r.URL.Query().Get("skip"); s != "" {
			if parsed, err := strconv.Atoi(s); err == nil && parsed >= 0 {
				skip = parsed
			}
		}
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
				limit = parsed
			}
		}

		regularOrders, farmOrders, err := fetchUserOrdersFromDB(ctx, userID, app)
		if err != nil {
			logger.Println("GetMyOrders FindMany error:", err)
			http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
			return
		}

		// Combine and consolidate all orders by creation date
		type CombinedOrder struct {
			OrderID       string                       `bson:"orderId" json:"orderId"`
			OrderType     string                       `json:"orderType"` // "regular" or "farm"
			UserID        string                       `bson:"userId" json:"userId"`
			FarmID        string                       `json:"farmId,omitempty"`
			Items         map[string][]models.CartItem `bson:"items" json:"items,omitempty"`
			Address       string                       `bson:"address" json:"address,omitempty"`
			PaymentMethod string                       `bson:"paymentMethod" json:"paymentMethod,omitempty"`
			Total         int64                        `bson:"total" json:"total"` // In paise
			Status        string                       `bson:"status" json:"status"`
			CreatedAt     time.Time                    `bson:"createdAt" json:"createdAt"`
			ApprovedBy    []string                     `bson:"approvedBy" json:"approvedBy,omitempty"`
		}

		var allOrders []CombinedOrder

		// Add regular orders
		for _, order := range regularOrders {
			allOrders = append(allOrders, CombinedOrder{
				OrderID:       order.OrderID,
				OrderType:     "regular",
				UserID:        order.UserID,
				Items:         order.Items,
				Address:       order.Address,
				PaymentMethod: order.PaymentMethod,
				Total:         order.Total,
				Status:        order.Status,
				CreatedAt:     order.CreatedAt,
				ApprovedBy:    order.ApprovedBy,
			})
		}

		// Add farm orders (convert priceAtPurchase to paise)
		// Pre-fetch transactions for farm orders to derive accurate payment method/status
		orderIDs := make([]string, 0, len(farmOrders))
		for _, o := range farmOrders {
			orderIDs = append(orderIDs, o.OrderID)
		}

		txnByOrder := map[string]models.Transaction{}
		if len(orderIDs) > 0 {
			var txns []models.Transaction
			_ = app.DB.FindMany(ctx, "transactions", bson.M{
				"entity_type": "order",
				"entity_id":   bson.M{"$in": orderIDs},
			}, &txns)

			for _, t := range txns {
				if t.EntityID != "" {
					txnByOrder[t.EntityID] = t
				}
			}
		}

		for _, order := range farmOrders {
			pm := mapPaymentStatus(order.Status)
			if txn, ok := txnByOrder[order.OrderID]; ok {
				pm = mapPaymentStatusFromTxn(&txn, order.Status)
			}

			// Resolve ApprovedBy IDs to user display names where possible
			resolvedApprovedBy := make([]string, 0, len(order.ApprovedBy))
			for _, approverID := range order.ApprovedBy {
				if approverID == "" {
					continue
				}
				var u models.User
				if err := app.DB.FindOne(ctx, "users", bson.M{"userid": approverID}, &u); err == nil {
					if u.Name != "" {
						resolvedApprovedBy = append(resolvedApprovedBy, u.Name)
						continue
					}
				}
				// Fallback to the ID if name not found
				resolvedApprovedBy = append(resolvedApprovedBy, approverID)
			}

			allOrders = append(allOrders, CombinedOrder{
				OrderID:       order.OrderID,
				OrderType:     "farm",
				UserID:        order.UserID,
				FarmID:        order.FarmID,
				Items:         order.Items,
				Address:       order.Address,
				PaymentMethod: pm,
				Total:         int64(order.PriceAtPurchase * 100), // Convert rupees to paise
				Status:        string(order.Status),
				CreatedAt:     order.CreatedAt,
				ApprovedBy:    resolvedApprovedBy,
			})
		}

		// Sort by creation date (newest first)
		sort.Slice(allOrders, func(i, j int) bool {
			return allOrders[i].CreatedAt.After(allOrders[j].CreatedAt)
		})

		// Apply pagination on combined results
		total := len(allOrders)
		start := skip
		end := skip + limit
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}

		paginatedOrders := allOrders[start:end]

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"orders": paginatedOrders,
			"total":  total,
			"skip":   skip,
			"limit":  limit,
		})
	}
}

func mapPaymentStatus(status models.OrderStatus) string {
	switch string(status) {
	case "paid", "delivered":
		return "paid"
	case "rejected":
		return "unpaid"
	default:
		return "pending"
	}
}

func mapPaymentStatusFromTxn(txn *models.Transaction, status models.OrderStatus) string {
	if txn == nil {
		return mapPaymentStatus(status)
	}

	if strings.ToLower(txn.Status) == "success" {
		return "paid"
	}

	if strings.ToLower(txn.Method) == "cod" {
		return "pending"
	}

	return mapPaymentStatus(status)
}
