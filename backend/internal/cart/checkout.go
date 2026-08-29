package cart

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"

	log "scav/utils/logger"
)

const (
	initiateTimeout = 5 * time.Second
	sessionTimeout  = 10 * time.Second

	deliveryFee = int64(2000) // ₹20 in paise
	taxRate     = 0.05

	maxCheckoutItems = 100
)

/* ───────────────────────── Initiate Checkout ───────────────────────── */

func InitiateCheckout(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(
				w,
				"Unauthorized",
				http.StatusUnauthorized,
			)
			return
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			initiateTimeout,
		)
		defer cancel()

		items, err := getCartItemsFromDB(
			ctx,
			userID,
			app,
		)

		if err != nil {
			http.Error(
				w,
				"Failed to fetch cart",
				http.StatusInternalServerError,
			)
			return
		}

		if len(items) == 0 {
			http.Error(
				w,
				"Cart is empty",
				http.StatusBadRequest,
			)
			return
		}

		if len(items) > maxCheckoutItems {
			http.Error(
				w,
				"Cart contains too many items",
				http.StatusBadRequest,
			)
			return
		}

		/*
			Revalidate current inventory before starting checkout.
		*/
		if err := validateCartForCheckout(
			ctx,
			items,
			app,
		); err != nil {
			http.Error(
				w,
				err.Error(),
				http.StatusConflict,
			)
			return
		}

		if err := mq.PublishWithMeta(
			ctx,
			app.MQ,
			mqevent.CheckoutInitiatedEvent,
			mqevent.CheckoutInitiatedPayload{},
		); err != nil {
			log.Printf(
				"InitiateCheckout event failed user=%s: %v",
				userID,
				err,
			)
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]any{
				"status": "ok",
				"items":  len(items),
			},
		)
	}
}

/* ───────────────────────── Create Checkout Session ───────────────────────── */

func CreateCheckoutSession(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(
				w,
				"Unauthorized",
				http.StatusUnauthorized,
			)
			return
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			sessionTimeout,
		)
		defer cancel()

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			maxRequestBody,
		)
		defer r.Body.Close()

		/*
			The client only supplies checkout metadata.

			It does NOT supply authoritative items/prices.
		*/
		var payload struct {
			Address string `json:"address"`
			Coupon  string `json:"coupon"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(
				w,
				"Invalid request body",
				http.StatusBadRequest,
			)
			return
		}

		payload.Address = strings.TrimSpace(payload.Address)
		payload.Coupon = strings.TrimSpace(payload.Coupon)

		if payload.Address == "" {
			http.Error(
				w,
				"Address required",
				http.StatusBadRequest,
			)
			return
		}

		/*
			CRITICAL:

			Load the authenticated user's actual cart.

			Never trust cart contents supplied by the browser.
		*/
		cartItems, err := getCartItemsFromDB(
			ctx,
			userID,
			app,
		)

		if err != nil {
			http.Error(
				w,
				"Failed to fetch cart",
				http.StatusInternalServerError,
			)
			return
		}

		if len(cartItems) == 0 {
			http.Error(
				w,
				"Cart is empty",
				http.StatusBadRequest,
			)
			return
		}

		if len(cartItems) > maxCheckoutItems {
			http.Error(
				w,
				"Cart contains too many items",
				http.StatusBadRequest,
			)
			return
		}

		validatedItems, subtotal, itemDiscountTotal, err :=
			validateAndPriceItems(
				ctx,
				cartItems,
				app,
			)

		if err != nil {
			http.Error(
				w,
				err.Error(),
				http.StatusConflict,
			)
			return
		}

		discount := calculateTotalDiscount(
			ctx,
			payload.Coupon,
			subtotal,
			itemDiscountTotal,
			app,
		)

		if discount > subtotal {
			discount = subtotal
		}

		totalAfterDiscount := subtotal - discount

		tax := int64(
			float64(totalAfterDiscount) * taxRate,
		)

		total := totalAfterDiscount +
			tax +
			deliveryFee

		session := map[string]any{
			"items":     validatedItems,
			"subtotal":  subtotal,
			"discount":  discount,
			"tax":       tax,
			"delivery":  deliveryFee,
			"total":     total,
			"address":   payload.Address,
			"createdAt": time.Now(),
			"userid":    userID,
		}

		if err := mq.PublishWithMeta(
			ctx,
			app.MQ,
			mqevent.CheckoutSessionCreatedEvent,
			mqevent.CheckoutSessionCreatedPayload{},
		); err != nil {
			log.Printf(
				"CreateCheckoutSession event failed user=%s: %v",
				userID,
				err,
			)
		}

		utils.RespondWithJSON(
			w,
			http.StatusCreated,
			session,
		)
	}
}

/* ───────────────────────── Cart Validation ───────────────────────── */

func validateCartForCheckout(
	ctx context.Context,
	items []CartItem,
	app *infra.Deps,
) error {
	if len(items) == 0 {
		return errors.New("cart is empty")
	}

	for _, item := range items {
		if item.ItemID == "" {
			return errors.New("cart contains an invalid item")
		}

		if item.ItemType == "" {
			return errors.New("cart contains an invalid item type")
		}

		if err := validateCartQuantity(item.Quantity); err != nil {
			return err
		}

		details, err := lookupItemDetailsByType(
			ctx,
			item.ItemID,
			item.ItemType,
			item.Category,
			app,
		)

		if err != nil {
			return errors.New(
				"one or more cart items are unavailable",
			)
		}

		if item.Quantity > details.Available {
			return errors.New(
				"one or more cart items are out of stock",
			)
		}
	}

	return nil
}

/* ───────────────────────── Price Validation ───────────────────────── */

func validateAndPriceItems(
	ctx context.Context,
	items []CartItem,
	app *infra.Deps,
) ([]CartItem, int64, int64, error) {
	validatedItems := make(
		[]CartItem,
		0,
		len(items),
	)

	var subtotal int64
	var itemDiscountTotal int64

	for _, item := range items {
		if item.ItemID == "" {
			return nil, 0, 0, errors.New(
				"invalid item in cart",
			)
		}

		if item.ItemType == "" {
			return nil, 0, 0, errors.New(
				"invalid item type in cart",
			)
		}

		if err := validateCartQuantity(item.Quantity); err != nil {
			return nil, 0, 0, err
		}

		/*
			Database is always the pricing authority.
		*/
		details, err := lookupItemDetailsByType(
			ctx,
			item.ItemID,
			item.ItemType,
			item.Category,
			app,
		)

		if err != nil {
			return nil, 0, 0, errors.New(
				"one or more cart items are unavailable",
			)
		}

		if item.Quantity > details.Available {
			return nil, 0, 0, errors.New(
				"insufficient stock",
			)
		}

		price := moneyToPaise(details.Price)

		/*
			Discount is a percentage.

			Example:

			    ₹100 × 10% = ₹10 discount
		*/
		lineSubtotal :=
			price * int64(item.Quantity)

		lineDiscount :=
			calculatePercentageDiscount(
				lineSubtotal,
				details.Discount,
			)

		subtotal += lineSubtotal
		itemDiscountTotal += lineDiscount

		validatedItems = append(
			validatedItems,
			CartItem{
				ItemID:     item.ItemID,
				ItemName:   details.Name,
				ItemType:   details.Type,
				Quantity:   item.Quantity,
				Price:      price,
				Discount:   discountToBasisPoints(details.Discount),
				Unit:       details.Unit,
				Category:   details.Category,
				EntityID:   details.EntityID,
				EntityType: details.EntityType,
			},
		)
	}

	return validatedItems,
		subtotal,
		itemDiscountTotal,
		nil
}

/* ───────────────────────── Discount Calculation ───────────────────────── */

func calculatePercentageDiscount(
	amount int64,
	percent float64,
) int64 {
	if amount <= 0 || percent <= 0 {
		return 0
	}

	if percent > 100 {
		percent = 100
	}

	return int64(
		float64(amount)*percent/100 + 0.5,
	)
}

func calculateTotalDiscount(
	ctx context.Context,
	couponCode string,
	subtotal int64,
	itemDiscountTotal int64,
	app *infra.Deps,
) int64 {
	discount := itemDiscountTotal

	if couponCode == "" {
		return discount
	}

	couponRes, err := validateCouponServer(
		ctx,
		couponCode,
		subtotal,
		app,
	)

	if err != nil {
		log.Printf(
			"coupon validation failed: %v",
			err,
		)

		return discount
	}

	if couponRes != nil &&
		couponRes.DiscountAmount > 0 {
		discount += couponRes.DiscountAmount
	}

	if discount > subtotal {
		discount = subtotal
	}

	return discount
}
