package products

import (
	"context"
	"encoding/json"
	"scav/infra"
	"scav/infra/db"
	"scav/internal/farms"
	"scav/utils"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// --------------------------------------------------
// Items
// --------------------------------------------------

func GetItems(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		filter := bson.M{}

		if t := r.URL.Query().Get("type"); t != "" {
			filter["type"] = t
		}
		if c := r.URL.Query().Get("category"); c != "" {
			filter["category"] = c
		}
		if s := r.URL.Query().Get("search"); s != "" {
			filter["name"] = utils.RegexFilter("name", s)["name"]
		}

		skip, limit := utils.ParsePagination(r, 10, 100)
		var sortMap bson.D

		switch r.URL.Query().Get("sort") {
		case "price_asc":
			sortMap = bson.D{{Key: "price", Value: 1}}

		case "price_desc":
			sortMap = bson.D{{Key: "price", Value: -1}}

		case "name_desc":
			sortMap = bson.D{{Key: "name", Value: -1}}

		default:
			sortMap = bson.D{{Key: "name", Value: 1}}
		}

		opts := db.FindManyOptions{
			Skip:  int(skip),
			Limit: int(limit),
			Sort:  sortMap,
		}

		var items []farms.Product
		if err := app.DB.FindManyWithOptions(ctx, productsCollection, filter, opts, &items); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch items")
			return
		}

		total, err := app.DB.CountDocuments(ctx, productsCollection, filter)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to count items")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"items":   items,
			"total":   total,
			"page":    skip/limit + 1,
			"limit":   limit,
		})
	}
}

// --------------------------------------------------
// Item Categories
// --------------------------------------------------

func GetItemCategories(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemType := r.URL.Query().Get("type")

		var categories []string

		switch itemType {
		case "tool":
			categories = []string{
				"Cutting Tools",
				"Irrigation Tools",
				"Harvesting Tools",
				"Hand Tools",
				"Protective Gear",
				"Fertilizer Applicators",
			}
		default:
			categories = []string{
				"Spices",
				"Pickles",
				"Flour",
				"Oils",
				"Honey",
				"Tea & Coffee",
				"Dry Fruits",
				"Natural Sweeteners",
			}
		}

		if err := json.NewEncoder(w).Encode(categories); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to encode response")
		}
	}
}
