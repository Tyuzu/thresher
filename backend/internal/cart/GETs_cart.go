// cart/get_cart.go
package cart

import (
	"context"
	"net/http"
	"time"

	"scav/infra"
	"scav/utils"
)

// GetCart returns cart items grouped by category
func GetCart(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		category := r.URL.Query().Get("category")

		groupedCart, err := getGroupedCart(ctx, userID, category, app)
		if err != nil {
			http.Error(w, "Failed to fetch cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}
