package farms

import (
	"context"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

/* ---------------------------------------------------- */
/* Get farms selling a specific crop ID                 */
/* ---------------------------------------------------- */

func GetCropFarms(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		cropID := utils.GetParam(r, "cropid")
		skip, limit := utils.ParsePagination(r, 10, 100)
		sortBy := r.URL.Query().Get("sortBy")
		sortOrder := r.URL.Query().Get("sortOrder")
		breedFilter := strings.ToLower(r.URL.Query().Get("breed"))

		var crops []Crop
		if err := app.DB.FindMany(ctx, cropsCollection, bson.M{"cropid": cropID}, &crops); err != nil || len(crops) == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "Crop not found")
			return
		}

		cropName := crops[0].Name
		cropCategory := crops[0].Category

		farmIDs := make([]string, 0, len(crops))
		for _, c := range crops {
			farmIDs = append(farmIDs, c.FarmID)
		}

		var farms []Farm
		if err := app.DB.FindMany(
			ctx,
			farmsCollection,
			bson.M{"farmid": bson.M{"$in": farmIDs}},
			&farms,
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch farms")
			return
		}

		farmMap := make(map[string]Farm, len(farms))
		for _, f := range farms {
			farmMap[f.FarmID] = f
		}

		listings := make([]CropListing, 0)
		for _, crop := range crops {
			if breedFilter != "" && strings.ToLower(crop.Notes) != breedFilter {
				continue
			}
			if farm, ok := farmMap[crop.FarmID]; ok {
				listings = append(listings, CropListing{
					FarmID:     crop.FarmID,
					FarmName:   farm.Name,
					Location:   farm.Location,
					Breed:      crop.Notes,
					PricePerKg: crop.Price,
					Banner:     crop.Banner,
				})
			}
		}

		sortCropListings(listings, sortBy, sortOrder)

		paginated, page := paginate(listings, skip, limit)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success":  true,
			"name":     cropName,
			"category": cropCategory,
			"listings": paginated,
			"total":    len(listings),
			"page":     page,
			"limit":    limit,
		})
	}
}

/* ---------------------------------------------------- */
/* Get farms by crop name (case-insensitive)            */
/* ---------------------------------------------------- */

func GetCropTypeFarms(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		cropName := utils.GetParam(r, "cropname")
		if cropName == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing crop name parameter")
			return
		}

		skip, limit := utils.ParsePagination(r, 10, 100)
		sortBy := r.URL.Query().Get("sortBy")
		sortOrder := r.URL.Query().Get("sortOrder")
		breedFilter := strings.ToLower(r.URL.Query().Get("breed"))

		filter := bson.M{
			"name": bson.M{
				"$regex":   "^" + regexp.QuoteMeta(cropName) + "$",
				"$options": "i",
			},
		}

		var crops []Crop
		if err := app.DB.FindMany(ctx, cropsCollection, filter, &crops); err != nil || len(crops) == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "Crop type not found")
			return
		}

		cropCategory := crops[0].Category

		farmIDs := make([]string, 0, len(crops))
		for _, c := range crops {
			farmIDs = append(farmIDs, c.FarmID)
		}

		var farms []Farm
		if err := app.DB.FindMany(
			ctx,
			farmsCollection,
			bson.M{"farmid": bson.M{"$in": farmIDs}},
			&farms,
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch farms")
			return
		}

		farmMap := make(map[string]Farm, len(farms))
		for _, f := range farms {
			farmMap[f.FarmID] = f
		}

		listings := make([]CropListing, 0)
		for _, crop := range crops {
			if breedFilter != "" && strings.ToLower(crop.Notes) != breedFilter {
				continue
			}
			if farm, ok := farmMap[crop.FarmID]; ok {
				var harvestDate string
				if crop.HarvestDate != nil {
					harvestDate = crop.HarvestDate.Format(time.RFC3339)
				}

				listings = append(listings, CropListing{
					FarmID: crop.FarmID,
					CropId: crop.CropId,

					FarmName: farm.Name,
					Location: farm.Location,

					Breed: crop.Notes,

					PricePerKg:     crop.Price,
					AvailableQtyKg: crop.Quantity,
					Unit:           crop.Unit,

					HarvestDate: harvestDate,
					PlantedDate: func() string {
						if crop.PlantedDate.IsZero() {
							return ""
						}
						return crop.PlantedDate.Format(time.RFC3339)
					}(),

					LastSoldAt: func() string {
						if crop.LastSoldAt.IsZero() {
							return ""
						}
						return crop.LastSoldAt.Format(time.RFC3339)
					}(),

					Featured:   crop.Featured,
					OutOfStock: crop.OutOfStock,

					AvgRating:   farm.AvgRating,
					ReviewCount: farm.ReviewCount,

					FavoritesCount: farm.FavoritesCount,

					Availability: farm.Availability,
					Phone:        farm.ContactInfo.Phone,

					InventoryValue: crop.Price * float64(crop.Quantity),

					Tags:   farm.Tags,
					Banner: crop.Banner,
				})
			}
		}

		sortCropListings(listings, sortBy, sortOrder)

		paginated, page := paginate(listings, skip, limit)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success":  true,
			"name":     cropName,
			"category": cropCategory,
			"listings": paginated,
			"total":    len(listings),
			"page":     page,
			"limit":    limit,
		})
	}
}

/* ---------------------------------------------------- */
/* Get single farm with crops                           */
/* ---------------------------------------------------- */

func GetFarm(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		id := utils.GetParam(r, "id")

		var farm Farm
		if err := app.DB.FindOne(ctx, farmsCollection, bson.M{"farmid": id}, &farm); err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, utils.M{
				"success": false,
				"message": "Farm not found",
			})
			return
		}

		var crops []Crop
		_ = app.DB.FindMany(ctx, cropsCollection, bson.M{"farmid": id}, &crops)

		farm.Crops = crops

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"farm":    farm,
		})
	}
}

/* ---------------------------------------------------- */
/* Paginated farms with lookup                          */
/* ---------------------------------------------------- */

func GetPaginatedFarms(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		skip, limit := utils.ParsePagination(r, 10, 100)
		search := r.URL.Query().Get("search")

		pipeline := make([]any, 0)

		if search != "" {
			pipeline = append(pipeline, bson.M{
				"$match": bson.M{
					"$or": []bson.M{
						utils.RegexFilter("name", search),
						utils.RegexFilter("location", search),
						utils.RegexFilter("owner", search),
					},
				},
			})
		}

		pipeline = append(
			pipeline,
			bson.M{"$sort": bson.M{"createdAt": -1}},
			bson.M{"$lookup": bson.M{
				"from":         "crops",
				"localField":   "farmid",
				"foreignField": "farmid",
				"as":           "crops",
			}},
			bson.M{"$skip": skip},
			bson.M{"$limit": limit},
		)

		var farms []Farm
		if err := app.DB.Aggregate(ctx, farmsCollection, pipeline, &farms); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error fetching farms")
			return
		}

		total, _ := app.DB.CountDocuments(ctx, farmsCollection, bson.M{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"farms":   farms,
			"total":   total,
			"page":    skip/limit + 1,
			"limit":   limit,
		})
	}
}

/* ---------------------------------------------------- */
/* Local helpers                                        */
/* ---------------------------------------------------- */

func sortCropListings(listings []CropListing, sortBy, sortOrder string) {
	switch sortBy {
	case "price":
		sort.Slice(listings, func(i, j int) bool {
			if sortOrder == "desc" {
				return listings[i].PricePerKg > listings[j].PricePerKg
			}
			return listings[i].PricePerKg < listings[j].PricePerKg
		})
	case "breed":
		sort.Slice(listings, func(i, j int) bool {
			if sortOrder == "desc" {
				return listings[i].Breed > listings[j].Breed
			}
			return listings[i].Breed < listings[j].Breed
		})
	}
}

func paginate[T any](items []T, skip, limit int) ([]T, int) {
	total := len(items)
	if skip > total {
		skip = total
	}
	end := skip + limit
	if end > total {
		end = total
	}
	page := skip/limit + 1
	return items[skip:end], page
}
