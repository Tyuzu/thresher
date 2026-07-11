package cart

import (
	"context"
	"encoding/json"
	"log"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* ───────────────────────── Order Placement ───────────────────────── */

func PlaceOrder(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		var payload struct {
			Address       string                       `json:"address"`
			Items         map[string][]models.CartItem `json:"items"`
			PaymentMethod string                       `json:"paymentMethod"`
			Coupon        string                       `json:"coupon"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid checkout payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if payload.Address == "" {
			http.Error(w, "Address is required", http.StatusBadRequest)
			return
		}

		if len(payload.Items) == 0 {
			http.Error(w, "No items in checkout", http.StatusBadRequest)
			return
		}

		// Flatten items from grouped structure
		var allItems []models.CartItem
		for category, items := range payload.Items {
			for _, item := range items {
				item.Category = category
				allItems = append(allItems, item)
			}
		}

		// Validate all items before processing order
		var subtotal int64
		var itemDiscountTotal int64

		validatedGroupedItems := make(map[string][]models.CartItem)

		for _, item := range allItems {
			details, err := lookupItemDetails(ctx, item.ItemID, app)
			if err != nil {
				http.Error(w, "Item "+item.ItemID+" is no longer available", http.StatusBadRequest)
				return
			}

			// Price in paise
			price := int64(details.Price * 100)
			itemDiscount := int64(details.Discount * 100)

			if item.Quantity > details.Available {
				http.Error(
					w,
					"Requested quantity of "+details.Name+" exceeds available stock",
					http.StatusBadRequest,
				)
				return
			}

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

		// Item-level discounts and coupon validation
		discount := itemDiscountTotal

		if payload.Coupon != "" {
			couponRes, err := validateCouponServer(
				ctx,
				payload.Coupon,
				subtotal,
				app,
			)

			if err != nil {
				log.Println("Coupon validation error:", err)
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

		farmOrders, err := processFarmOrders(ctx, checkout, app)
		if err != nil {
			http.Error(w, "Failed to process farm orders", http.StatusInternalServerError)
			return
		}

		genOrder, err := processGeneralOrders(ctx, checkout, app)
		if err != nil {
			http.Error(w, "Failed to process orders", http.StatusInternalServerError)
			return
		}

		if _, err := app.DB.Delete(
			ctx,
			cartCollection,
			bson.M{"userId": userID},
		); err != nil {
			log.Println("Cart cleanup error:", err)
		}

		resp := map[string]any{
			"success":    true,
			"farmOrders": farmOrders,
		}

		if genOrder != nil {
			resp["order"] = genOrder
		}

		mqpayload, _ := json.Marshal(mqevent.OrderPlacedPayload{})
		app.MQ.Publish(ctx, mqevent.OrderPlacedEvent, mqpayload)

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

	grouped := make(map[string][]models.CartItem)

	for _, item := range cropItems {
		if item.EntityType == "farm" {
			grouped[item.EntityID] = append(grouped[item.EntityID], item)
		}
	}

	var orders []models.FarmOrder

	for farmID, items := range grouped {

		var farmSubtotal int64
		var totalQty int

		for _, item := range items {
			farmSubtotal += item.Price * int64(item.Quantity)
			totalQty += item.Quantity
		}

		// Allocate checkout-level charges proportionally
		var discount int64
		var tax int64
		var delivery int64

		if checkout.Subtotal > 0 {
			ratio := float64(farmSubtotal) / float64(checkout.Subtotal)

			discount = int64(float64(checkout.Discount) * ratio)
			tax = int64(float64(checkout.Tax) * ratio)
			delivery = int64(float64(checkout.Delivery) * ratio)
		}

		farmTotal := farmSubtotal - discount + tax + delivery

		order := models.FarmOrder{
			OrderID:         "ORD" + utils.GenerateRandomDigitString(9),
			UserID:          checkout.UserID,
			FarmID:          farmID,
			Status:          "pending",
			ApprovedBy:      []string{},
			Items:           map[string][]models.CartItem{"crops": items},
			CreatedAt:       time.Now(),
			Quantity:        totalQty,
			PriceAtPurchase: float64(farmSubtotal) / 100,
			Address:         checkout.Address,

			// Invoice fields
			Subtotal: farmSubtotal,
			Discount: discount,
			Tax:      tax,
			Delivery: delivery,
			Total:    farmTotal,
		}

		// Populate crop id (first item's item id) if available
		if len(items) > 0 {
			order.CropID = items[0].ItemID
		}

		// Populate buyer name and phone from user record when available
		var user models.User
		if err := app.DB.FindOne(ctx, "users", bson.M{"userid": checkout.UserID}, &user); err == nil {
			if user.Name != "" {
				order.Name = user.Name
			}
			// prefer phone_number field if present
			if user.PhoneNumber != "" {
				order.Phone = user.PhoneNumber
			}
		}

		if err := app.DB.Insert(ctx, farmOrdersCollection, order); err != nil {
			log.Println("FarmOrders insert error:", err)
			return nil, err
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

	order := models.Order{
		OrderID:       "ORD" + utils.GenerateRandomDigitString(9),
		UserID:        checkout.UserID,
		Items:         nonCropItems,
		Address:       checkout.Address,
		PaymentMethod: checkout.PaymentMethod,

		// Invoice fields
		Subtotal: checkout.Subtotal,
		Discount: checkout.Discount,
		Tax:      checkout.Tax,
		Delivery: checkout.Delivery,
		Total:    checkout.Total,

		Status:     "pending",
		ApprovedBy: []string{},
		CreatedAt:  time.Now(),
	}

	if err := app.DB.Insert(ctx, ordersCollection, order); err != nil {
		log.Println("Order insert error:", err)
		return nil, err
	}

	return &order, nil
}

// var user models.User
// _ = app.DB.FindOne(ctx, usersCollection,
//     map[string]any{"userid": checkout.UserID},
//     &user)

// order.Name = user.Name
// order.Phone = user.Phone
