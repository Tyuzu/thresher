package farms

import (
	"context"
	"naevis/farms/repo"
	fu "naevis/farms/usecase"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

/* ---------------------------------------------------- */
/* Incoming orders                                      */
/* ---------------------------------------------------- */

func GetIncomingOrders(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		orders, err := uc.FindFarmOrders(ctx, bson.M{})
		if err != nil {
			log.Println("GetIncomingOrders error:", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		incoming := make([]models.IncomingOrder, 0, len(orders))
		for _, o := range orders {
			user := getUserByID(ctx, o.UserID, app)
			crop := getCropByID(ctx, o.CropID, app)

			incoming = append(incoming, models.IncomingOrder{
				ID:           o.OrderID,
				Buyer:        user.Name,
				Contact:      user.Email,
				Crop:         crop.Name,
				Qty:          o.Quantity,
				Unit:         crop.Unit,
				OrderDate:    o.CreatedAt.Format("2006-01-02"),
				DeliveryDate: estimateDeliveryDate(o.CreatedAt),
				Address:      user.Address,
				Payment:      "pending",
				Status:       string(o.Status),
			})
		}

		utils.RespondWithJSON(w, http.StatusOK,
			map[string]interface{}{
				"success": true,
				"orders":  incoming,
			},
		)
	}
}

/* ---------------------------------------------------- */
/* Helpers                                              */
/* ---------------------------------------------------- */

func getUserByID(ctx context.Context, id string, app *infra.Deps) models.User {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	user, err := uc.GetUserByID(ctx, id)
	if err != nil {
		return models.User{}
	}
	return user
}

func getCropByID(ctx context.Context, id string, app *infra.Deps) models.Crop {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := fu.NewFarmsUsecase(repoImpl)

	crop, err := uc.GetCropByID(ctx, id)
	if err != nil {
		return models.Crop{}
	}
	return crop
}

func estimateDeliveryDate(created time.Time) string {
	return created.Add(72 * time.Hour).Format("2006-01-02")
}
