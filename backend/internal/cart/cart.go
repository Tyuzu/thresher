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

const updateCartTimeout = 8 * time.Second

/* ───────────────────────── Update Entire Cart ───────────────────────── */

// UpdateCart replaces the user's cart with a completely validated cart.
//
// IMPORTANT:
// The client provides only item identity + quantity.
// Price/name/category/entity data are resolved from the database.
func UpdateCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			updateCartTimeout,
		)
		defer cancel()

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			maxRequestBody,
		)
		defer r.Body.Close()

		var payload struct {
			Items []CartItem `json:"items"`
		}

		decoder := json.NewDecoder(r.Body)

		if err := decoder.Decode(&payload); err != nil {
			http.Error(
				w,
				"Invalid JSON payload",
				http.StatusBadRequest,
			)
			return
		}

		/*
			Reject oversized carts before doing database work.
		*/
		if len(payload.Items) > 100 {
			http.Error(
				w,
				"Too many cart items",
				http.StatusBadRequest,
			)
			return
		}

		docs, err := prepareValidatedCartDocs(
			ctx,
			userID,
			payload.Items,
			app,
		)

		if err != nil {
			http.Error(
				w,
				err.Error(),
				http.StatusBadRequest,
			)
			return
		}

		if err := replaceCartItemsInDB(
			ctx,
			userID,
			docs,
			app,
		); err != nil {
			log.Printf(
				"UpdateCart database error user=%s: %v",
				userID,
				err,
			)

			http.Error(
				w,
				"Failed to update cart",
				http.StatusInternalServerError,
			)
			return
		}

		updated, err := getCartItemsFromDB(
			ctx,
			userID,
			app,
		)

		if err != nil {
			http.Error(
				w,
				"Failed to fetch updated cart",
				http.StatusInternalServerError,
			)
			return
		}

		if err := mq.PublishWithMeta(
			ctx,
			app.MQ,
			mqevent.CartItemUpdatedEvent,
			mqevent.CartItemUpdatedPayload{},
		); err != nil {
			log.Printf(
				"UpdateCart event publish failed user=%s: %v",
				userID,
				err,
			)
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			updated,
		)
	}
}

/* ───────────────────────── Update Item Quantity ───────────────────────── */

func UpdateItemQuantity(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(
			r.Context(),
			5*time.Second,
		)
		defer cancel()

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			maxRequestBody,
		)
		defer r.Body.Close()

		var payload struct {
			ItemID     string `json:"itemId"`
			ItemType   string `json:"itemType"`
			Category   string `json:"category"`
			Quantity   int    `json:"quantity"`
			EntityID   string `json:"entityId"`
			EntityType string `json:"entityType"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			log.Printf(
				"UpdateItemQuantity decode error: %v",
				err,
			)

			http.Error(
				w,
				"Invalid JSON payload",
				http.StatusBadRequest,
			)
			return
		}

		payload.ItemID = strings.TrimSpace(payload.ItemID)
		payload.ItemType = strings.ToLower(strings.TrimSpace(payload.ItemType))
		payload.Category = strings.ToLower(strings.TrimSpace(payload.Category))
		payload.EntityID = strings.TrimSpace(payload.EntityID)
		payload.EntityType = strings.ToLower(strings.TrimSpace(payload.EntityType))

		if payload.ItemID == "" {
			http.Error(
				w,
				"Item ID is required",
				http.StatusBadRequest,
			)
			return
		}

		if payload.ItemType == "" {
			http.Error(
				w,
				"Item type is required",
				http.StatusBadRequest,
			)
			return
		}

		if err := validateCartQuantity(payload.Quantity); err != nil {
			http.Error(
				w,
				err.Error(),
				http.StatusBadRequest,
			)
			return
		}

		/*
			Resolve the actual item first.

			This prevents a client from changing the quantity of some
			other collection's item simply by guessing an ID.
		*/
		details, err := lookupItemDetailsByType(
			ctx,
			payload.ItemID,
			payload.ItemType,
			payload.Category,
			app,
		)

		if err != nil {
			http.Error(
				w,
				"Item not found",
				http.StatusNotFound,
			)
			return
		}

		if payload.Quantity > details.Available {
			http.Error(
				w,
				"Insufficient stock",
				http.StatusConflict,
			)
			return
		}

		/*
			Use server-owned identity information.
		*/
		category := details.Category
		entityID := details.EntityID
		entityType := details.EntityType

		_, err = updateCartItemQuantityInDB(
			ctx,
			userID,
			payload.ItemID,
			category,
			payload.Quantity,
			entityID,
			entityType,
			app,
		)

		if err != nil {
			log.Printf(
				"UpdateItemQuantity database error: %v",
				err,
			)

			http.Error(
				w,
				"Failed to update item quantity",
				http.StatusInternalServerError,
			)
			return
		}

		groupedCart, err := getGroupedCart(
			ctx,
			userID,
			"",
			app,
		)

		if err != nil {
			http.Error(
				w,
				"Failed to fetch updated cart",
				http.StatusInternalServerError,
			)
			return
		}

		if err := mq.PublishWithMeta(
			ctx,
			app.MQ,
			mqevent.ItemQuantityUpdatedEvent,
			mqevent.ItemQuantityUpdatedPayload{},
		); err != nil {
			log.Printf(
				"UpdateItemQuantity event publish failed: %v",
				err,
			)
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			groupedCart,
		)
	}
}

/* ───────────────────────── Validation ───────────────────────── */

func prepareValidatedCartDocs(
	ctx context.Context,
	userID string,
	items []CartItem,
	app *infra.Deps,
) ([]any, error) {
	now := time.Now()

	docs := make([]any, 0, len(items))

	/*
		Prevent duplicate logical cart entries.

		Without this, a malicious client can submit the same item twice
		and produce ambiguous cart state.
	*/
	seen := make(map[string]struct{}, len(items))

	for _, it := range items {
		itemID := strings.TrimSpace(it.ItemID)
		itemType := strings.ToLower(strings.TrimSpace(it.ItemType))

		if itemID == "" {
			return nil, errors.New("cart item id is required")
		}

		if itemType == "" {
			return nil, errors.New("cart item type is required")
		}

		if err := validateCartQuantity(it.Quantity); err != nil {
			return nil, err
		}

		key := itemType + ":" + itemID

		if _, exists := seen[key]; exists {
			return nil, errors.New(
				"duplicate item in cart",
			)
		}

		seen[key] = struct{}{}

		details, err := lookupItemDetailsByType(
			ctx,
			itemID,
			itemType,
			it.Category,
			app,
		)

		if err != nil {
			return nil, errors.New(
				"one or more cart items are invalid or unavailable",
			)
		}

		if it.Quantity > details.Available {
			return nil, errors.New(
				"one or more cart items exceed available stock",
			)
		}

		docs = append(
			docs,
			CartItem{
				UserID:     userID,
				ItemID:     itemID,
				ItemName:   details.Name,
				ItemType:   details.Type,
				Unit:       details.Unit,
				Category:   details.Category,
				Price:      moneyToPaise(details.Price),
				Discount:   discountToBasisPoints(details.Discount),
				Quantity:   it.Quantity,
				AddedAt:    now,
				EntityID:   details.EntityID,
				EntityType: details.EntityType,
			},
		)
	}

	return docs, nil
}

/* ───────────────────────── Stock Validation ───────────────────────── */

func validateStockAvailability(
	ctx context.Context,
	itemID string,
	itemType string,
	category string,
	requestedQty int,
	app *infra.Deps,
) error {
	if err := validateCartQuantity(requestedQty); err != nil {
		return err
	}

	details, err := lookupItemDetailsByType(
		ctx,
		itemID,
		itemType,
		category,
		app,
	)

	if err != nil {
		return err
	}

	if requestedQty > details.Available {
		return errors.New("insufficient stock")
	}

	return nil
}
