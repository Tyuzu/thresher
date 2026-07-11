package menu

import (
	"encoding/json"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// BuyMenu atomically decreases stock using FindOneAndUpdate
func BuyMenu(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		placeID := ps.ByName("placeid")
		menuID := ps.ByName("menuid")

		var body struct {
			Quantity int `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Quantity <= 0 {
			http.Error(w, "Invalid quantity", http.StatusBadRequest)
			return
		}

		ctx := r.Context()

		// Build atomic filter and update
		filter := map[string]any{
			"placeid": placeID,
			"menuid":  menuID,
			"stock":   map[string]any{"$gte": body.Quantity}, // ensure enough stock
		}
		update := map[string]any{
			"$inc": map[string]int{"stock": -body.Quantity},
			"$set": map[string]any{"updated_at": time.Now()},
		}

		var updatedMenu models.Menu
		err := app.DB.FindOneAndUpdate(ctx, menuCollection, filter, update, &updatedMenu)
		if err != nil {
			http.Error(w, "Insufficient stock or menu not found", http.StatusConflict)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.MenuBoughtEvent, mqevent.MenuBoughtPayload{})

		// Respond with remaining stock
		resp := map[string]any{
			"success":        true,
			"remainingStock": updatedMenu.Stock,
		}
		utils.RespondWithJSON(w, http.StatusOK, resp)
	}
}
