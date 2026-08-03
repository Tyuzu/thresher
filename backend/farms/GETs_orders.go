package farms

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/farms/repo"
	fu "naevis/farms/usecase"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

/* ---------------------------------------------------- */
/* Orders placed BY the current user (buyer)            */
/* ---------------------------------------------------- */

func GetMyFarmOrders(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

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

		repoImpl := repo.NewMongoRepo(app.DB)
		uc := fu.NewFarmsUsecase(repoImpl)

		orders, err := uc.FindFarmOrders(ctx, bson.M{"userid": userID})
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to fetch orders",
			})
			return
		}

		// Apply pagination
		total := len(orders)
		start := skip
		end := skip + limit
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}

		paginatedOrders := orders[start:end]

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"orders":  paginatedOrders,
			"total":   total,
			"skip":    skip,
			"limit":   limit,
		})
	}
}

/* ---------------------------------------------------- */
/* Orders coming INTO farms owned by the farmer         */
/* ---------------------------------------------------- */

func GetIncomingFarmOrders(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		// 1. Fetch farms owned by this user
		repoImpl := repo.NewMongoRepo(app.DB)
		uc := fu.NewFarmsUsecase(repoImpl)

		var farms []models.Farm
		farms, err := uc.FindFarms(ctx, bson.M{"createdby": userID})
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to fetch farms",
			})
			return
		}

		// Cache farms in a lookup map by ID
		farmMap := make(map[string]models.Farm)
		farmIDs := make([]string, 0, len(farms))
		for _, f := range farms {
			farmIDs = append(farmIDs, f.FarmID)
			farmMap[f.FarmID] = f
		}

		if len(farmIDs) == 0 {
			utils.RespondWithJSON(w, http.StatusOK, utils.M{
				"success": true,
				"orders":  []OrderDisplay{},
			})
			return
		}

		// 2. Build filter query from URL params
		filter := bson.M{"farmid": bson.M{"$in": farmIDs}}

		// Filter by status
		if status := r.URL.Query().Get("status"); status != "" {
			filter["status"] = status
		}

		// Filter by date range
		if dateFrom := r.URL.Query().Get("dateFrom"); dateFrom != "" {
			if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
				filter["createdat"] = bson.M{"$gte": t}
			}
		}

		if dateTo := r.URL.Query().Get("dateTo"); dateTo != "" {
			if t, err := time.Parse("2006-01-02", dateTo); err == nil {
				// Add one day to include all orders on that date
				t = t.Add(24 * time.Hour)
				if _, ok := filter["createdat"]; ok {
					if existingDateFilter, ok := filter["createdat"].(bson.M); ok {
						existingDateFilter["$lte"] = t
						filter["createdat"] = existingDateFilter
					}
				} else {
					filter["createdat"] = bson.M{"$lte": t}
				}
			}
		}

		// 3. Fetch orders for those farms
		var orders []models.FarmOrder
		orders, err = uc.FindFarmOrders(ctx, filter)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to fetch orders",
			})
			return
		}

		// 4. Build frontend-friendly response and apply client-side filters
		displayOrders := make([]OrderDisplay, 0, len(orders))
		cropFilter := r.URL.Query().Get("crop")
		paymentFilter := r.URL.Query().Get("payment")

		// Pre-fetch transactions for these orders to derive accurate payment status
		orderIDs := make([]string, 0, len(orders))
		for _, o := range orders {
			orderIDs = append(orderIDs, o.OrderID)
		}

		txnByOrder := map[string]models.Transaction{}
		if len(orderIDs) > 0 {
			var txns []models.Transaction
			txns, _ = uc.FindTransactions(ctx, bson.M{
				"entitytype": "order",
				"entityid":   bson.M{"$in": orderIDs},
			})
			for _, t := range txns {
				if t.EntityID != "" {
					txnByOrder[t.EntityID] = t
				}
			}
		}

		for _, o := range orders {
			user, _ := uc.GetUserByID(ctx, o.UserID)
			crop, _ := uc.GetCropByID(ctx, o.CropID)
			farm := farmMap[o.FarmID]

			// Client-side filtering for crop
			if cropFilter != "" && crop.Name != cropFilter {
				continue
			}

			// Client-side filtering for payment status
			var paymentStatus string
			if txn, ok := txnByOrder[o.OrderID]; ok {
				paymentStatus = derivePaymentStatusFromTxn(&txn, o.Status)
			} else {
				paymentStatus = derivePaymentStatus(o.Status)
			}
			if paymentFilter != "" && paymentStatus != paymentFilter {
				continue
			}

			displayOrders = append(displayOrders, OrderDisplay{
				ID:           o.OrderID,
				Buyer:        user.UserID,
				Farm:         firstNonEmpty(farm.FarmID, farm.Name),
				Contact:      user.Email,
				Crop:         firstNonEmpty(crop.Name, crop.CropId),
				CropID:       crop.CropId,
				Qty:          o.Quantity,
				Unit:         crop.Unit,
				OrderDate:    o.CreatedAt.Format("2006-01-02"),
				DeliveryDate: estimateDeliveryDate(o.CreatedAt),
				Address:      firstNonEmpty(o.Address, user.Address),
				Payment:      paymentStatus,
				Status:       string(o.Status),
			})
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"orders":  displayOrders,
		})
	}
}

// helper: return first non-empty string from args
func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func derivePaymentStatus(status models.OrderStatus) string {
	normalized := string(status)

	switch normalized {
	case "paid", "delivered":
		return "paid"
	case "rejected":
		return "unpaid"
	default:
		return "pending"
	}
}

// derivePaymentStatusFromTxn returns a payment label using transaction information
func derivePaymentStatusFromTxn(txn *models.Transaction, status models.OrderStatus) string {
	if txn == nil {
		return derivePaymentStatus(status)
	}

	// If transaction succeeded, consider it paid
	if strings.ToLower(txn.Status) == "success" {
		return "paid"
	}

	// If method is cod and txn exists but not success, treat as pending
	if strings.ToLower(txn.Method) == "cod" {
		return "pending"
	}

	// Fallback to order-based derivation
	return derivePaymentStatus(status)
}
