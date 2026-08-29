package cart

import (
	"context"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"scav/infra"
	"scav/internal/auth"
	"scav/internal/pay"
	"scav/utils"
	"scav/utils/logger"

	"go.mongodb.org/mongo-driver/bson"
)

const defaultOrdersTimeout = 10 * time.Second

/* ───────────────────────── Get User Orders ───────────────────────── */

// GetMyOrders fetches and unifies regular and farm orders for the authenticated user.
func GetMyOrders(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		skip := parseQueryInt(r, "skip", 0, 0, 10000)
		limit := parseQueryInt(r, "limit", 10, 1, 100)

		ctx, cancel := context.WithTimeout(r.Context(), defaultOrdersTimeout)
		defer cancel()

		regularOrders, farmOrders, err := fetchUserOrdersFromDB(ctx, userID, app)
		if err != nil {
			logger.Printf("GetMyOrders fetch error for user %s: %v", userID, err)
			http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
			return
		}

		allOrders := make([]combinedOrder, 0, len(regularOrders)+len(farmOrders))

		for _, order := range regularOrders {
			allOrders = append(allOrders, combinedOrder{
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

		orderIDs, approverIDSet := extractFarmOrderMetadata(farmOrders)
		txnByOrder := fetchTransactionsByOrderIDs(ctx, app, orderIDs)
		userNameMap := fetchUserNamesByIDs(ctx, app, approverIDSet)

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
				if name, found := userNameMap[approverID]; found {
					resolvedApprovedBy = append(resolvedApprovedBy, name)
				} else {
					resolvedApprovedBy = append(resolvedApprovedBy, approverID)
				}
			}

			allOrders = append(allOrders, combinedOrder{
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

		// Sort newest first
		sort.Slice(allOrders, func(i, j int) bool {
			return allOrders[i].CreatedAt.After(allOrders[j].CreatedAt)
		})

		// Secure pagination slice
		total := len(allOrders)
		start := min(skip, total)
		end := min(start+limit, total)

		paginatedOrders := allOrders[start:end]
		if paginatedOrders == nil {
			paginatedOrders = []combinedOrder{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"orders": paginatedOrders,
			"total":  total,
			"skip":   skip,
			"limit":  limit,
		})
	}
}

/* ───────────────────────── Helper Functions ───────────────────────── */

func extractFarmOrderMetadata(farmOrders []FarmOrder) ([]string, map[string]struct{}) {
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
	return orderIDs, approverIDSet
}

func fetchTransactionsByOrderIDs(ctx context.Context, app *infra.Deps, orderIDs []string) map[string]pay.Transaction {
	txnMap := make(map[string]pay.Transaction)
	if len(orderIDs) == 0 {
		return txnMap
	}

	var txns []pay.Transaction
	err := app.DB.FindMany(ctx, "transactions", bson.M{
		"entity_type": "order",
		"entity_id":   bson.M{"$in": orderIDs},
	}, &txns)
	if err != nil {
		logger.Printf("Warning: failed to fetch transactions: %v", err)
		return txnMap
	}

	for _, t := range txns {
		if t.EntityID != "" {
			txnMap[t.EntityID] = t
		}
	}
	return txnMap
}

func fetchUserNamesByIDs(ctx context.Context, app *infra.Deps, userIDs map[string]struct{}) map[string]string {
	nameMap := make(map[string]string)
	if len(userIDs) == 0 {
		return nameMap
	}

	ids := make([]string, 0, len(userIDs))
	for id := range userIDs {
		ids = append(ids, id)
	}

	var users []auth.User
	err := app.DB.FindMany(ctx, "users", bson.M{"userid": bson.M{"$in": ids}}, &users)
	if err != nil {
		logger.Printf("Warning: failed to batch fetch users: %v", err)
		return nameMap
	}

	for _, u := range users {
		if u.Name != "" {
			nameMap[u.UserID] = u.Name
		}
	}
	return nameMap
}

func parseQueryInt(r *http.Request, key string, defaultVal, minVal, maxVal int) int {
	str := r.URL.Query().Get(key)
	if str == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(str)
	if err != nil || val < minVal {
		return defaultVal
	}
	if val > maxVal {
		return maxVal
	}
	return val
}

func mapPaymentStatus(status OrderStatus) string {
	switch string(status) {
	case "paid", "delivered":
		return "paid"
	case "rejected":
		return "unpaid"
	default:
		return "pending"
	}
}

func mapPaymentStatusFromTxn(txn *pay.Transaction, status OrderStatus) string {
	if txn == nil {
		return mapPaymentStatus(status)
	}

	if strings.EqualFold(txn.Status, "success") {
		return "paid"
	}

	if strings.EqualFold(txn.Method, "cod") {
		return "pending"
	}

	return mapPaymentStatus(status)
}
