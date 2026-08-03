package cart

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"

	"go.mongodb.org/mongo-driver/bson"
)

const checkoutTimeout = 15 * time.Second

func (p placeOrderRequest) validate() error {
	if p.Address == "" {
		return fmt.Errorf("address is required")
	}
	if len(p.Items) == 0 {
		return fmt.Errorf("no items in checkout")
	}
	return nil
}

/* ───────────────────────── Order Placement ───────────────────────── */

// PlaceOrder validates items, calculates charges, and records farm and general orders.
func PlaceOrder(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload placeOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid checkout payload", http.StatusBadRequest)
			return
		}

		if err := payload.validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), checkoutTimeout)
		defer cancel()

		// 1. Flatten items from grouped payload structure
		var allItems []models.CartItem
		for category, items := range payload.Items {
			for _, item := range items {
				item.Category = category
				allItems = append(allItems, item)
			}
		}

		// 2. Validate availability and calculate totals (in paise)
		var subtotal int64
		var itemDiscountTotal int64
		validatedGroupedItems := make(map[string][]models.CartItem)

		for _, item := range allItems {
			details, err := lookupItemDetails(ctx, item.ItemID, app)
			if err != nil {
				http.Error(w, fmt.Sprintf("Item %s is no longer available", item.ItemID), http.StatusBadRequest)
				return
			}

			if item.Quantity > details.Available {
				http.Error(
					w,
					fmt.Sprintf("Requested quantity of %s exceeds available stock", details.Name),
					http.StatusBadRequest,
				)
				return
			}

			price := int64(details.Price * 100)
			itemDiscount := int64(details.Discount * 100)

			subtotal += price * int64(item.Quantity)
			itemDiscountTotal += itemDiscount * int64(item.Quantity)

			category := details.Category
			validatedGroupedItems[category] = append(
				validatedGroupedItems[category],
				models.CartItem{
					ItemID:     item.ItemID,
					ItemName:   details.Name,
					Quantity:   item.Quantity,
					Price:      price,
					Category:   category,
					EntityID:   details.EntityID,
					EntityType: details.EntityType,
				},
			)
		}

		// 3. Coupon and total calculation
		discount := itemDiscountTotal
		if payload.Coupon != "" {
			couponRes, err := validateCouponServer(ctx, payload.Coupon, subtotal, app)
			if err != nil {
				log.Printf("Coupon validation error: %v", err)
			} else if couponRes != nil {
				discount += couponRes.DiscountAmount
			}
		}

		totalAfterDiscount := subtotal - discount
		if totalAfterDiscount < 0 {
			totalAfterDiscount = 0
		}

		// Charges (stored in paise)
		tax := int64(float64(totalAfterDiscount) * 0.05)
		delivery := int64(2000) // ₹20
		total := totalAfterDiscount + tax + delivery

		checkout := models.CheckoutSession{
			UserID:        userID,
			Address:       payload.Address,
			PaymentMethod: payload.PaymentMethod,
			Items:         validatedGroupedItems,
			Subtotal:      subtotal,
			Discount:      discount,
			Tax:           tax,
			Delivery:      delivery,
			Total:         total,
		}

		// 4. Process split order fulfillment
		farmOrders, err := processFarmOrders(ctx, checkout, app)
		if err != nil {
			log.Printf("PlaceOrder: failed to process farm orders: %v", err)
			http.Error(w, "Failed to process farm orders", http.StatusInternalServerError)
			return
		}

		genOrder, err := processGeneralOrders(ctx, checkout, app)
		if err != nil {
			log.Printf("PlaceOrder: failed to process general orders: %v", err)
			http.Error(w, "Failed to process orders", http.StatusInternalServerError)
			return
		}

		// 5. Cleanup user's active cart upon success
		if _, err := app.DB.Delete(ctx, cartCollection, bson.M{"userid": userID}); err != nil {
			log.Printf("PlaceOrder: cart cleanup error for user %s: %v", userID, err)
		}

		resp := map[string]any{
			"success":    true,
			"farmOrders": farmOrders,
		}
		if genOrder != nil {
			resp["order"] = genOrder
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.OrderPlacedEvent, mqevent.OrderPlacedPayload{}); err != nil {
			log.Printf("PlaceOrder: failed to publish order placed event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusCreated, resp)
	}
}

func processFarmOrders(
	ctx context.Context,
	checkout models.CheckoutSession,
	app *infra.Deps,
) ([]models.FarmOrder, error) {
	cropItems, ok := checkout.Items["crops"]
	if !ok || len(cropItems) == 0 {
		return nil, nil
	}

	// Fetch buyer info once up front rather than inside the per-farm loop
	var user models.User
	var userName, userPhone string
	if err := app.DB.FindOne(ctx, "users", bson.M{"userid": checkout.UserID}, &user); err == nil {
		userName = user.Name
		if user.PhoneNumber != "" {
			userPhone = user.PhoneNumber
		}
	}

	grouped := make(map[string][]models.CartItem)
	for _, item := range cropItems {
		if item.EntityType == "farm" {
			grouped[item.EntityID] = append(grouped[item.EntityID], item)
		}
	}

	orders := make([]models.FarmOrder, 0, len(grouped))

	for farmID, items := range grouped {
		var farmSubtotal int64
		var totalQty int

		for _, item := range items {
			farmSubtotal += item.Price * int64(item.Quantity)
			totalQty += item.Quantity
		}

		var discount, tax, delivery int64
		if checkout.Subtotal > 0 {
			ratio := float64(farmSubtotal) / float64(checkout.Subtotal)
			discount = int64(float64(checkout.Discount) * ratio)
			tax = int64(float64(checkout.Tax) * ratio)
			delivery = int64(float64(checkout.Delivery) * ratio)
		}

		farmTotal := farmSubtotal - discount + tax + delivery

		genID, _ := utils.GenerateRandomString(9)
		order := models.FarmOrder{
			OrderID:         "ORD" + genID,
			UserID:          checkout.UserID,
			FarmID:          farmID,
			Name:            userName,
			Phone:           userPhone,
			Status:          "pending",
			ApprovedBy:      []string{},
			Items:           map[string][]models.CartItem{"crops": items},
			CreatedAt:       time.Now(),
			Quantity:        totalQty,
			PriceAtPurchase: float64(farmSubtotal) / 100,
			Address:         checkout.Address,
			Subtotal:        farmSubtotal,
			Discount:        discount,
			Tax:             tax,
			Delivery:        delivery,
			Total:           farmTotal,
		}

		if len(items) > 0 {
			order.CropID = items[0].ItemID
		}

		if err := app.DB.Insert(ctx, farmOrdersCollection, order); err != nil {
			log.Printf("processFarmOrders: DB insert error for farm %s: %v", farmID, err)
			return nil, fmt.Errorf("failed to insert farm order: %w", err)
		}

		orders = append(orders, order)
	}

	return orders, nil
}

func processGeneralOrders(
	ctx context.Context,
	checkout models.CheckoutSession,
	app *infra.Deps,
) (*models.Order, error) {
	nonCropItems := make(map[string][]models.CartItem)

	for category, items := range checkout.Items {
		if category != "crops" && len(items) > 0 {
			nonCropItems[category] = items
		}
	}

	if len(nonCropItems) == 0 {
		return nil, nil
	}

	genID, _ := utils.GenerateRandomString(9)
	order := models.Order{
		OrderID:       "ORD" + genID,
		UserID:        checkout.UserID,
		Items:         nonCropItems,
		Address:       checkout.Address,
		PaymentMethod: checkout.PaymentMethod,
		Subtotal:      checkout.Subtotal,
		Discount:      checkout.Discount,
		Tax:           checkout.Tax,
		Delivery:      checkout.Delivery,
		Total:         checkout.Total,
		Status:        "pending",
		ApprovedBy:    []string{},
		CreatedAt:     time.Now(),
	}

	if err := app.DB.Insert(ctx, ordersCollection, order); err != nil {
		log.Printf("processGeneralOrders: DB insert error: %v", err)
		return nil, fmt.Errorf("failed to insert general order: %w", err)
	}

	return &order, nil
}
