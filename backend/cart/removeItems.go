package cart

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	log "naevis/utils/logger"
)

const defaultTimeout = 10 * time.Second

func (r removeFromCartRequest) validate() error {
	if r.ItemID == "" || r.Category == "" {
		return errors.New("itemId and category are required")
	}
	return nil
}

/* ───────────────────────── Remove From Cart ───────────────────────── */

// RemoveFromCart removes a specific item from the user's cart.
func RemoveFromCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req removeFromCartRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("RemoveFromCart decode error: %v", err)
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		if err := req.validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), defaultTimeout)
		defer cancel()

		if err := deleteCartItemFromDB(ctx, userID, req.ItemID, req.Category, req.EntityID, req.EntityType, app); err != nil {
			log.Printf("RemoveFromCart Delete error: %v", err)
			http.Error(w, "Failed to remove item from cart", http.StatusInternalServerError)
			return
		}

		groupedCart, err := getGroupedCart(ctx, userID, "", app)
		if err != nil {
			log.Printf("RemoveFromCart fetch updated cart error: %v", err)
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.ItemRemovedFromCartEvent, mqevent.ItemRemovedFromCartPayload{}); err != nil {
			log.Printf("failed to publish item removed event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}

/* ───────────────────────── Clear Cart ───────────────────────── */

// ClearCart removes all items from the user's cart.
func ClearCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), defaultTimeout)
		defer cancel()

		if err := clearCartForUser(ctx, userID, app); err != nil {
			log.Printf("ClearCart Delete error: %v", err)
			http.Error(w, "Failed to clear cart", http.StatusInternalServerError)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CartClearedEvent, mqevent.CartClearedPayload{}); err != nil {
			log.Printf("failed to publish cart cleared event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Cart cleared successfully",
		})
	}
}
