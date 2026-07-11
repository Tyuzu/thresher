package pay

import (
	"context"
	"encoding/json"
	"log"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const RefundsCollection = "refunds"

// Collections are defined in payDB.go but declared here for reference
// var transactionsCollection - from payDB.go
// var ordersCollection - from payDB.go
// var farmOrdersCollection - from payDB.go

/* ───────────────────────── Create Refund Request ───────────────────────── */
func CreateRefundRequest(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		var req struct {
			OrderID string `json:"order_id"`
			Reason  string `json:"reason"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.OrderID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Order ID is required")
			return
		}

		if len(req.Reason) < 10 {
			utils.RespondWithError(w, http.StatusBadRequest, "Reason must be at least 10 characters")
			return
		}

		var (
			orderType string
			amount    int64
		)

		// Try regular order first.
		var regularOrder models.Order
		err := app.DB.FindOne(ctx, ordersCollection, bson.M{
			"orderId": req.OrderID,
			"userId":  userID,
		}, &regularOrder)

		switch {
		case err == nil:
			orderType = "regular"
			amount = regularOrder.Total

		case err == mongo.ErrNoDocuments:
			var farmOrder models.FarmOrder

			err = app.DB.FindOne(ctx, farmOrdersCollection, bson.M{
				"orderid": req.OrderID,
				"userid":  userID,
			}, &farmOrder)

			if err != nil {
				if err == mongo.ErrNoDocuments {
					utils.RespondWithError(w, http.StatusNotFound, "Order not found")
				} else {
					log.Println("FindOne farm order error:", err)
					utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
				}
				return
			}

			orderType = "farm"
			amount = farmOrder.Total

		default:
			log.Println("FindOne order error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		// Ensure there isn't already an active refund request.
		var existingRefund models.RefundRequest

		err = app.DB.FindOne(ctx, RefundsCollection, bson.M{
			"order_id": req.OrderID,
			"status": bson.M{
				"$in": []string{"pending", "approved"},
			},
		}, &existingRefund)

		if err == nil {
			utils.RespondWithError(w, http.StatusConflict, "A refund request already exists for this order")
			return
		}

		if err != mongo.ErrNoDocuments {
			log.Println("FindOne existing refund error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		now := time.Now()

		refundReq := models.OrderRefundRequest{
			ID:        utils.GetUUID(),
			OrderID:   req.OrderID,
			UserID:    userID,
			OrderType: orderType,
			Amount:    amount,
			Reason:    req.Reason,
			Status:    "pending",
			CreatedAt: now,
			UpdatedAt: now,
		}

		if err := app.DB.InsertOne(ctx, RefundsCollection, refundReq); err != nil {
			log.Println("InsertOne refund request error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create refund request")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.RefundRequested, mqevent.RefundRequestedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"id":      refundReq.ID,
			"status":  refundReq.Status,
			"message": "Refund request submitted. An admin will review it shortly.",
		})
	}
}

/* ───────────────────────── Get User's Refund Requests ───────────────────────── */

func GetMyRefundRequests(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Parse pagination
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

		// Count total
		total, err := app.DB.Count(ctx, RefundsCollection, bson.M{
			"user_id": userID,
		})
		if err != nil {
			log.Println("Count refund requests error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		// Query options
		opts := options.Find().
			SetSkip(int64(skip)).
			SetLimit(int64(limit)).
			SetSort(bson.D{{Key: "created_at", Value: -1}})

		// Fetch refunds
		var refunds []models.RefundRequest
		err = app.DB.FindMany(
			ctx,
			RefundsCollection,
			bson.M{"user_id": userID},
			&refunds,
			opts,
		)
		if err != nil {
			log.Println("FindMany refund requests error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch refund requests")
			return
		}

		if refunds == nil {
			refunds = []models.RefundRequest{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"refunds": refunds,
			"total":   total,
			"skip":    skip,
			"limit":   limit,
		})
	}
}

/* ───────────────────────── Get Refund Requests (Admin) ───────────────────────── */

func GetAllRefundRequests(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		// Check if user is admin
		if !isAdmin(ctx) {
			utils.RespondWithError(w, http.StatusForbidden, "Admin access required")
			return
		}

		// Parse filters
		status := r.URL.Query().Get("status")
		orderType := r.URL.Query().Get("order_type")

		skip := 0
		limit := 20

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

		// Build filter
		filter := bson.M{}

		if status != "" {
			filter["status"] = status
		}

		if orderType != "" {
			filter["order_type"] = orderType
		}

		// Count total
		total, err := app.DB.Count(ctx, RefundsCollection, filter)
		if err != nil {
			log.Println("Count refund requests error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}

		// Query options
		opts := options.Find().
			SetSkip(int64(skip)).
			SetLimit(int64(limit)).
			SetSort(bson.D{{Key: "created_at", Value: -1}})

		// Fetch refunds
		var refunds []models.RefundRequest

		err = app.DB.FindMany(
			ctx,
			RefundsCollection,
			filter,
			&refunds,
			opts,
		)
		if err != nil {
			log.Println("FindMany refund requests error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch refund requests")
			return
		}

		if refunds == nil {
			refunds = []models.RefundRequest{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"refunds": refunds,
			"total":   total,
			"skip":    skip,
			"limit":   limit,
		})
	}
}

/* ───────────────────────── Approve Refund Request ───────────────────────── */

func ApproveRefundRequest(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		adminID := utils.GetUserIDFromRequest(r)
		if adminID == "" || !isAdmin(ctx) {
			utils.RespondWithError(w, http.StatusForbidden, "Admin access required")
			return
		}

		refundID := ps.ByName("id")
		if refundID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Refund ID required")
			return
		}

		var req struct {
			Notes string `json:"notes"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		var refund models.OrderRefundRequest
		err := app.DB.FindOne(ctx, RefundsCollection, bson.M{"_id": refundID}, &refund)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				utils.RespondWithError(w, http.StatusNotFound, "Refund request not found")
			} else {
				log.Println("FindOne refund error:", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			}
			return
		}

		if refund.Status != "pending" {
			utils.RespondWithError(w, http.StatusConflict, "Can only approve pending refund requests")
			return
		}

		refundTxn := models.Transaction{
			ID:         utils.GetUUID(),
			UserID:     refund.UserID,
			Type:       "refund",
			Method:     "wallet",
			EntityType: "order",
			EntityID:   refund.OrderID,
			Amount:     refund.Amount,
			Currency:   "INR",
			Status:     "success",
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
			Meta: models.Meta{
				"refund_request_id": refundID,
				"order_type":        refund.OrderType,
			},
		}

		if err := app.DB.InsertOne(ctx, transactionsCollection, refundTxn); err != nil {
			log.Println("InsertOne refund transaction error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to process refund")
			return
		}

		now := time.Now()
		err = app.DB.UpdateOne(
			ctx,
			RefundsCollection,
			bson.M{"_id": refundID},
			bson.M{
				"$set": bson.M{
					"status":         "approved",
					"transaction_id": refundTxn.ID,
					"reviewed_by":    adminID,
					"reviewed_at":    now,
					"review_notes":   req.Notes,
					"updated_at":     now,
				},
			},
		)
		if err != nil {
			log.Println("UpdateOne refund request error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update refund request")
			return
		}

		event := map[string]any{
			"refund_request_id": refundID,
			"order_id":          refund.OrderID,
			"user_id":           refund.UserID,
			"amount":            refund.Amount,
			"transaction_id":    refundTxn.ID,
		}

		payload, _ := json.Marshal(event)
		_ = mq.PublishWithMeta(ctx, app.MQ, "order.refunded", payload)

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.RefundAccepted, mqevent.RefundAcceptedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"id":             refund.ID,
			"status":         "approved",
			"transaction_id": refundTxn.ID,
			"message":        "Refund approved successfully",
		})
	}
}
func RejectRefundRequest(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		adminID := utils.GetUserIDFromRequest(r)
		if adminID == "" || !isAdmin(ctx) {
			utils.RespondWithError(w, http.StatusForbidden, "Admin access required")
			return
		}

		refundID := ps.ByName("id")
		if refundID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Refund ID required")
			return
		}

		var req struct {
			Notes string `json:"notes"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		if req.Notes == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Rejection notes required")
			return
		}

		var refund models.OrderRefundRequest
		err := app.DB.FindOne(ctx, RefundsCollection, bson.M{"_id": refundID}, &refund)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				utils.RespondWithError(w, http.StatusNotFound, "Refund request not found")
			} else {
				log.Println("FindOne refund error:", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "Database error")
			}
			return
		}

		if refund.Status != "pending" {
			utils.RespondWithError(w, http.StatusConflict, "Can only reject pending refund requests")
			return
		}

		now := time.Now()
		err = app.DB.UpdateOne(
			ctx,
			RefundsCollection,
			bson.M{"_id": refundID},
			bson.M{
				"$set": bson.M{
					"status":       "rejected",
					"reviewed_by":  adminID,
					"reviewed_at":  now,
					"review_notes": req.Notes,
					"updated_at":   now,
				},
			},
		)
		if err != nil {
			log.Println("UpdateOne refund request error:", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update refund request")
			return
		}

		event := map[string]any{
			"refund_request_id": refundID,
			"order_id":          refund.OrderID,
			"user_id":           refund.UserID,
			"reason":            req.Notes,
		}

		payload, _ := json.Marshal(event)
		_ = mq.PublishWithMeta(ctx, app.MQ, "refund.rejected", payload)

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.RefundRejected, mqevent.RefundRejectedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"id":      refund.ID,
			"status":  "rejected",
			"message": "Refund request rejected",
		})
	}
}

// Helper function to check if user is admin
func isAdmin(ctx context.Context) bool {
	role, ok := ctx.Value("role").(string)
	return ok && role == "admin"
}
