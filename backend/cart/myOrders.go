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

		// 1. Batch collect IDs for Transactions AND Approver Users
		orderIDs := make([]string, 0, len(farmOrders))
		approverIDSet := make(map[string]struct{})
		for _, o := range farmOrders {
			orderIDs = append(orderIDs, o.OrderID)
			for _, id := range o.ApprovedBy {
				if id != "" {
					approverIDSet[id] = struct{}{}
				}
			}
		}

		// 2. Fetch Transactions in bulk
		txnByOrder := map[string]models.Transaction{}
		if len(orderIDs) > 0 {
			var txns []models.Transaction
			err := app.DB.FindMany(ctx, "transactions", bson.M{
				"entity_type": "order",
				"entity_id":   bson.M{"$in": orderIDs},
			}, &txns)
			if err != nil {
				logger.Println("Warning: failed to fetch transactions:", err)
			} else {
				for _, t := range txns {
					if t.EntityID != "" {
						txnByOrder[t.EntityID] = t
					}
				}
			}
		}

		// 3. FIX N+1: Fetch Approver Names in a single bulk query
		userNameMap := map[string]string{}
		if len(approverIDSet) > 0 {
			approverIDs := make([]string, 0, len(approverIDSet))
			for id := range approverIDSet {
				approverIDs = append(approverIDs, id)
			}

			var users []models.User
			err := app.DB.FindMany(ctx, "users", bson.M{"userid": bson.M{"$in": approverIDs}}, &users)
			if err != nil {
				logger.Println("Warning: failed to batch fetch users:", err)
			} else {
				for _, u := range users {
					if u.Name != "" {
						userNameMap[u.UserID] = u.Name
					}
				}
			}
		}

		// 4. Map farm orders using the cached user names
		for _, order := range farmOrders {
			pm := mapPaymentStatus(order.Status)
			if txn, ok := txnByOrder[order.OrderID]; ok {
				pm = mapPaymentStatusFromTxn(&txn, order.Status)
			}

			resolvedApprovedBy := make([]string, 0, len(order.ApprovedBy))
			for _, approverID := range order.ApprovedBy {
				if approverID == "" {
					continue
				}
				// Use cache map instead of querying DB inside the loop
				if name, found := userNameMap[approverID]; found {
					resolvedApprovedBy = append(resolvedApprovedBy, name)
				} else {
					resolvedApprovedBy = append(resolvedApprovedBy, approverID)
				}
			}

			allOrders = append(allOrders, CombinedOrder{
				OrderID:       order.OrderID,
				OrderType:     "farm",
				UserID:        order.UserID,
				FarmID:        order.FarmID,
				Items:         order.Items,
				Address:       order.Address,
				PaymentMethod: pm,
				Total:         int64(order.PriceAtPurchase * 100),
				Status:        string(order.Status),
				CreatedAt:     order.CreatedAt,
				ApprovedBy:    resolvedApprovedBy,
			})
		}

		// Sort by creation date (newest first)
		sort.Slice(allOrders, func(i, j int) bool {
			return allOrders[i].CreatedAt.After(allOrders[j].CreatedAt)
		})

		// Apply pagination on combined results securely
		total := len(allOrders)
		start := skip
		if start > total {
			start = total
		}
		end := start + limit
		if end > total {
			end = total
		}

		paginatedOrders := allOrders[start:end]

		// Safeguard to always return an empty array instead of null in JSON response if empty
		if paginatedOrders == nil {
			paginatedOrders = []CombinedOrder{}
		}

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
