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

const defaultTimeout = 5 * time.Second

func (r removeFromCartRequest) validate() error {
	if strings.TrimSpace(r.ItemID) == "" {
		return errors.New("itemId is required")
	}

	if strings.TrimSpace(r.ItemType) == "" {
		return errors.New("itemType is required")
	}

	return nil
}

/* ───────────────────────── Remove From Cart ───────────────────────── */

func RemoveFromCart(app *infra.Deps) http.HandlerFunc {
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
			defaultTimeout,
		)
		defer cancel()

		r.Body = http.MaxBytesReader(
			w,
			r.Body,
			maxRequestBody,
		)
		defer r.Body.Close()

		var req removeFromCartRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf(
				"RemoveFromCart decode error: %v",
				err,
			)

			http.Error(
				w,
				"Invalid JSON payload",
				http.StatusBadRequest,
			)
			return
		}

		req.ItemID = strings.TrimSpace(req.ItemID)
		req.ItemType = strings.ToLower(strings.TrimSpace(req.ItemType))
		req.Category = strings.ToLower(strings.TrimSpace(req.Category))

		if err := req.validate(); err != nil {
			http.Error(
				w,
				err.Error(),
				http.StatusBadRequest,
			)
			return
		}

		/*
			Resolve canonical identity from the database.

			Client supplied category/entity fields are not authoritative.
		*/
		details, err := lookupItemDetailsByType(
			ctx,
			req.ItemID,
			req.ItemType,
			req.Category,
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

		if err := deleteCartItemFromDB(
			ctx,
			userID,
			req.ItemID,
			details.Category,
			details.EntityID,
			details.EntityType,
			app,
		); err != nil {
			log.Printf(
				"RemoveFromCart delete error: %v",
				err,
			)

			http.Error(
				w,
				"Failed to remove item from cart",
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
			log.Printf(
				"RemoveFromCart fetch error: %v",
				err,
			)

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
			mqevent.CartItemDeletedEvent,
			mqevent.CartItemDeletedPayload{},
		); err != nil {
			log.Printf(
				"RemoveFromCart event publish failed: %v",
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

/* ───────────────────────── Clear Cart ───────────────────────── */

func ClearCart(app *infra.Deps) http.HandlerFunc {
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
			defaultTimeout,
		)
		defer cancel()

		if err := clearCartForUser(
			ctx,
			userID,
			app,
		); err != nil {
			log.Printf(
				"ClearCart delete error: %v",
				err,
			)

			http.Error(
				w,
				"Failed to clear cart",
				http.StatusInternalServerError,
			)
			return
		}

		if err := mq.PublishWithMeta(
			ctx,
			app.MQ,
			mqevent.CartClearedEvent,
			mqevent.CartClearedPayload{},
		); err != nil {
			log.Printf(
				"ClearCart event publish failed: %v",
				err,
			)
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]string{
				"message": "Cart cleared successfully",
			},
		)
	}
}
