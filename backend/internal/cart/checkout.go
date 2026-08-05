package cart

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"
)

const (
	initiateTimeout = 5 * time.Second
	sessionTimeout  = 10 * time.Second
	deliveryFee     = 2000 // ₹20 in paise
	taxRate         = 0.05 // 5% tax
)

/* ───────────────────────── Initiate Checkout ───────────────────────── */

// InitiateCheckout verifies the user's cart state before checkout begins.
func InitiateCheckout(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), initiateTimeout)
		defer cancel()

		items, err := getCartItemsFromDB(ctx, userID, app)
		if err != nil {
			http.Error(w, "Failed to fetch cart", http.StatusInternalServerError)
			return
		}

		if len(items) == 0 {
			http.Error(w, "Cart is empty", http.StatusBadRequest)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CheckoutInitiatedEvent, mqevent.CheckoutInitiatedPayload{}); err != nil {
			log.Printf("InitiateCheckout: failed to publish event for user %s: %v", userID, err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"status": "ok",
			"items":  len(items),
		})
	}
}

/* ───────────────────────── Create Checkout Session ───────────────────────── */

// CreateCheckoutSession recalculates item pricing, applies discounts, and constructs a checkout session.
func CreateCheckoutSession(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload createSessionPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if payload.Address == "" {
			http.Error(w, "Address required", http.StatusBadRequest)
			return
		}

		allItems := flattenCartItems(payload.Items)
		if len(allItems) == 0 {
			http.Error(w, "No items provided", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), sessionTimeout)
		defer cancel()

		validatedItems, subtotal, itemDiscountTotal, err := validateAndPriceItems(ctx, allItems, app)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		discount := calculateTotalDiscount(ctx, payload.Coupon, subtotal, itemDiscountTotal, app)
		totalAfterDiscount := max(0, subtotal-discount)

		tax := int64(float64(totalAfterDiscount) * taxRate)
		total := totalAfterDiscount + tax + deliveryFee

		session := map[string]any{
			"items":     validatedItems,
			"subtotal":  subtotal,
			"discount":  discount,
			"tax":       tax,
			"delivery":  deliveryFee,
			"total":     total,
			"address":   payload.Address,
			"createdAt": time.Now(),
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CheckoutSessionCreatedEvent, mqevent.CheckoutSessionCreatedPayload{}); err != nil {
			log.Printf("CreateCheckoutSession: failed to publish event for user %s: %v", userID, err)
		}

		utils.RespondWithJSON(w, http.StatusCreated, session)
	}
}

/* ───────────────────────── Helper Functions ───────────────────────── */

func flattenCartItems(groupedItems map[string][]models.CartItem) []models.CartItem {
	totalCapacity := 0
	for _, items := range groupedItems {
		totalCapacity += len(items)
	}

	allItems := make([]models.CartItem, 0, totalCapacity)
	for _, items := range groupedItems {
		allItems = append(allItems, items...)
	}
	return allItems
}

func validateAndPriceItems(ctx context.Context, items []models.CartItem, app *infra.Deps) ([]models.CartItem, int64, int64, error) {
	validatedItems := make([]models.CartItem, 0, len(items))
	var subtotal, itemDiscountTotal int64

	for _, item := range items {
		if item.ItemID == "" || item.Quantity <= 0 {
			continue
		}

		details, err := lookupItemDetails(ctx, item.ItemID, app)
		if err != nil {
			return nil, 0, 0, err
		}

		if item.Quantity > details.Available {
			return nil, 0, 0, err
		}

		// Calculate using database source-of-truth values
		price := int64(details.Price * 100)
		itemDiscount := int64(details.Discount * 100)
		lineSubtotal := price * int64(item.Quantity)
		lineDiscount := itemDiscount * int64(item.Quantity)

		subtotal += lineSubtotal
		itemDiscountTotal += lineDiscount

		validatedItems = append(validatedItems, models.CartItem{
			ItemID:     item.ItemID,
			ItemName:   details.Name,
			Quantity:   item.Quantity,
			Price:      price,
			Category:   details.Category,
			EntityID:   details.EntityID,
			EntityType: details.EntityType,
		})
	}

	return validatedItems, subtotal, itemDiscountTotal, nil
}

func calculateTotalDiscount(ctx context.Context, couponCode string, subtotal, itemDiscountTotal int64, app *infra.Deps) int64 {
	discount := itemDiscountTotal
	if couponCode == "" {
		return discount
	}

	couponRes, err := validateCouponServer(ctx, couponCode, subtotal, app)
	if err != nil {
		log.Printf("calculateTotalDiscount: coupon validation failed: %v", err)
		return discount
	}

	if couponRes != nil {
		discount += couponRes.DiscountAmount
	}
	return discount
}
