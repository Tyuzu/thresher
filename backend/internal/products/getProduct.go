package products

import (
	"context"
	"scav/infra"
	"scav/internal/farms"
	"scav/utils"
	"net/http"
)

func getProductEntity(ctx context.Context, id string, app *infra.Deps) farms.Product {
	var product farms.Product

	_ = app.DB.FindOne(ctx, productsCollection, map[string]any{
		"productid": id,
	}, &product)

	// If not found or error, zero-value product is returned (same behavior as before)
	return product
}

func GetProductDetails(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		entityType := utils.GetParam(r, "entityType")
		entityId := utils.GetParam(r, "entityId")

		var product farms.Product

		switch entityType {
		case "product", "tool":
			product = getProductEntity(ctx, entityId, app)
		// case "tool":
		// 	product = getToolEntity(entityId)
		// case "subscription":
		// 	product = getSubscriptionEntity(entityId)
		// case "media":
		// 	product = getMediaEntity(entityId)
		// case "fmcg":
		// 	product = getFMCGEntity(entityId)
		// case "art":
		// 	product = getArtEntity(entityId)
		default:
			http.Error(w, "Invalid entity type", http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, product)
	}
}
