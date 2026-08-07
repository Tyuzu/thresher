package cart

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
)

/* ───────────────────────── Add To Cart ───────────────────────── */

func AddToCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var item CartItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if item.ItemID == "" || item.Quantity <= 0 {
			http.Error(w, "Invalid item", http.StatusBadRequest)
			return
		}

		itemDetails, err := lookupItemDetails(ctx, item.ItemID, app)
		if err != nil {
			http.Error(w, "Item not found", http.StatusBadRequest)
			return
		}

		if item.Quantity > itemDetails.Available {
			http.Error(w, "Insufficient stock", http.StatusBadRequest)
			return
		}

		item.UserID = userID
		item.ItemName = itemDetails.Name
		item.ItemType = itemDetails.Type
		item.Unit = itemDetails.Unit
		item.Price = int64(itemDetails.Price * 100)
		item.Discount = int64(itemDetails.Discount * 100)
		item.Category = itemDetails.Category
		if item.EntityID == "" {
			item.EntityID = itemDetails.EntityID
		}
		if item.EntityType == "" {
			item.EntityType = itemDetails.EntityType
		}

		if err := upsertCartItemInDB(ctx, userID, item, app); err != nil {
			http.Error(w, "Failed to add to cart", http.StatusInternalServerError)
			return
		}

		/* -------- Publish CartItemAdded Event -------- */

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.CartItemCreatedEvent, mqevent.CartItemCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
	}
}
