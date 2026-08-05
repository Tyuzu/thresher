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

/* ───────────────────────── Update Cart ───────────────────────── */

// UpdateCart replaces the entire user cart with a validated list of items.
func UpdateCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			Items []models.CartItem `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		docs := prepareValidatedCartDocs(ctx, userID, payload.Items, app)

		if err := replaceCartItemsInDB(ctx, userID, docs, app); err != nil {
			http.Error(w, "Failed to update cart", http.StatusInternalServerError)
			return
		}

		updated, err := getCartItemsFromDB(ctx, userID, app)
		if err != nil {
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.CartItemUpdatedEvent, mqevent.CartItemUpdatedPayload{})
		utils.RespondWithJSON(w, http.StatusOK, updated)
	}
}

/* ───────────────────────── Update Item Quantity ───────────────────────── */

// UpdateItemQuantity updates the quantity of a specific item in the cart.
func UpdateItemQuantity(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			ItemID     string `json:"itemid"`
			Category   string `json:"category"`
			Quantity   int    `json:"quantity"`
			EntityID   string `json:"entityid,omitempty"`
			EntityType string `json:"entitytype,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			log.Println("UpdateItemQuantity decode error:", err)
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if payload.ItemID == "" || payload.Category == "" {
			http.Error(w, "ItemID and Category are required", http.StatusBadRequest)
			return
		}
		if payload.Quantity <= 0 {
			http.Error(w, "Quantity must be greater than 0", http.StatusBadRequest)
			return
		}

		if err := validateStockAvailability(ctx, payload.ItemID, payload.Quantity, app); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		_, err := updateCartItemQuantityInDB(
			ctx,
			userID,
			payload.ItemID,
			payload.Category,
			payload.Quantity,
			payload.EntityID,
			payload.EntityType,
			app,
		)
		if err != nil {
			log.Println("UpdateItemQuantity Update error:", err)
			http.Error(w, "Failed to update item quantity", http.StatusInternalServerError)
			return
		}

		groupedCart, err := getGroupedCart(ctx, userID, "", app)
		if err != nil {
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ItemQuantityUpdatedEvent, mqevent.ItemQuantityUpdatedPayload{})
		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}

/* ───────────────────────── Helper Functions ───────────────────────── */

func prepareValidatedCartDocs(
	ctx context.Context,
	userID string,
	items []models.CartItem,
	app *infra.Deps,
) []any {
	now := time.Now()
	docs := make([]any, 0, len(items))

	for _, it := range items {
		if it.ItemID == "" || it.Quantity <= 0 {
			continue
		}

		details, err := lookupItemDetails(ctx, it.ItemID, app)
		if err != nil {
			continue
		}

		qty := it.Quantity
		if qty > details.Available {
			qty = details.Available
		}
		if qty <= 0 {
			continue
		}

		docs = append(docs, models.CartItem{
			UserID:     userID,
			ItemID:     it.ItemID,
			ItemName:   details.Name,
			ItemType:   details.Type,
			Unit:       details.Unit,
			Category:   details.Category,
			Price:      int64(details.Price * 100),
			Quantity:   qty,
			AddedAt:    now,
			EntityID:   details.EntityID,
			EntityType: details.EntityType,
		})
	}

	return docs
}

func validateStockAvailability(ctx context.Context, itemID string, requestedQty int, app *infra.Deps) error {
	details, err := lookupItemDetails(ctx, itemID, app)
	if err != nil {
		return err
	}
	if requestedQty > details.Available {
		return http.ErrAbortHandler // standardized error path handled at caller level
	}
	return nil
}
