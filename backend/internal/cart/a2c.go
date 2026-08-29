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
	addToCartTimeout = 5 * time.Second
	maxRequestBody   = 64 * 1024
)

/* ───────────────────────── Add To Cart ───────────────────────── */

func AddToCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			addToCartTimeout,
		)
		defer cancel()

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			maxRequestBody,
		)
		defer r.Body.Close()

		var request struct {
			ItemID     string `json:"itemId"`
			ItemType   string `json:"itemType"`
			Category   string `json:"category"`
			EntityID   string `json:"entityId"`
			EntityType string `json:"entityType"`
			Quantity   int    `json:"quantity"`
		}

		decoder := json.NewDecoder(r.Body)

		if err := decoder.Decode(&request); err != nil {
			http.Error(
				w,
				"Invalid JSON payload",
				http.StatusBadRequest,
			)
			return
		}

		request.ItemID = strings.TrimSpace(request.ItemID)
		request.ItemType = strings.ToLower(strings.TrimSpace(request.ItemType))
		request.Category = strings.ToLower(strings.TrimSpace(request.Category))
		request.EntityID = strings.TrimSpace(request.EntityID)
		request.EntityType = strings.ToLower(strings.TrimSpace(request.EntityType))

		if request.ItemID == "" {
			http.Error(
				w,
				"Item ID is required",
				http.StatusBadRequest,
			)
			return
		}

		if request.ItemType == "" {
			http.Error(
				w,
				"Item type is required",
				http.StatusBadRequest,
			)
			return
		}

		if request.Quantity <= 0 || request.Quantity > maxCartQuantity {
			http.Error(
				w,
				"Invalid quantity",
				http.StatusBadRequest,
			)
			return
		}

		/*
			The type is used to select the correct collection.

			We DO NOT use the client's price/name/entity values.
		*/
		itemDetails, err := lookupItemDetailsByType(
			ctx,
			request.ItemID,
			request.ItemType,
			request.Category,
			app,
		)

		if err != nil {
			log.Printf(
				"AddToCart lookup failed user=%s item=%s type=%s: %v",
				userID,
				request.ItemID,
				request.ItemType,
				err,
			)

			http.Error(
				w,
				"Item not found or unavailable",
				http.StatusBadRequest,
			)
			return
		}

		if request.Quantity > itemDetails.Available {
			http.Error(
				w,
				"Insufficient stock",
				http.StatusConflict,
			)
			return
		}

		/*
			Server-owned cart representation.
		*/
		item := CartItem{
			UserID:   userID,
			ItemID:   request.ItemID,
			ItemName: itemDetails.Name,
			ItemType: itemDetails.Type,
			Unit:     itemDetails.Unit,
			Category: itemDetails.Category,
			Price:    moneyToPaise(itemDetails.Price),

			/*
				Stored as basis points of a percentage:
				10% -> 1000

				If your existing CartItem.Discount schema has a different
				meaning, keep that schema consistent everywhere.
			*/
			Discount: discountToBasisPoints(itemDetails.Discount),

			Quantity: request.Quantity,

			EntityID:   itemDetails.EntityID,
			EntityType: itemDetails.EntityType,

			AddedAt: time.Now(),
		}

		if err := upsertCartItemInDB(
			ctx,
			userID,
			item,
			app,
		); err != nil {
			log.Printf(
				"AddToCart database error user=%s item=%s: %v",
				userID,
				request.ItemID,
				err,
			)

			http.Error(
				w,
				"Failed to add item to cart",
				http.StatusInternalServerError,
			)
			return
		}

		/*
			Fetch the authoritative cart item after the update.

			This makes the response useful to the frontend instead of
			returning a meaningless {"status":"ok"}.
		*/
		cartItems, err := getCartItemsFromDB(
			ctx,
			userID,
			app,
		)

		if err != nil {
			http.Error(
				w,
				"Item added but failed to fetch cart",
				http.StatusInternalServerError,
			)
			return
		}

		if err := mq.PublishWithMeta(
			ctx,
			app.MQ,
			mqevent.CartItemCreatedEvent,
			mqevent.CartItemCreatedPayload{},
		); err != nil {
			log.Printf(
				"AddToCart event publish failed user=%s: %v",
				userID,
				err,
			)
		}

		utils.RespondWithJSON(
			w,
			http.StatusCreated,
			map[string]any{
				"status": "ok",
				"items":  cartItems,
			},
		)
	}
}

/* ───────────────────────── Money Helpers ───────────────────────── */

func moneyToPaise(value float64) int64 {
	if value <= 0 {
		return 0
	}

	return int64(value*100 + 0.5)
}

func discountToBasisPoints(percent float64) int64 {
	if percent <= 0 {
		return 0
	}

	if percent > 100 {
		percent = 100
	}

	return int64(percent*100 + 0.5)
}

/* ───────────────────────── Validation ───────────────────────── */

func validateCartQuantity(quantity int) error {
	if quantity <= 0 {
		return errors.New("quantity must be greater than zero")
	}

	if quantity > maxCartQuantity {
		return errors.New("quantity exceeds maximum allowed")
	}

	return nil
}
