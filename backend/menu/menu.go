package menu

import (
	"encoding/json"
	"fmt"
	"naevis/beats/dels"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// CreateMenu creates a new menu item
func CreateMenu(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		placeID := ps.ByName("placeid")
		if placeID == "" {
			http.Error(w, "Place ID is required", http.StatusBadRequest)
			return
		}

		var body struct {
			Name     string  `json:"name"`
			Price    float64 `json:"price"`
			Discount float64 `json:"discount"`
			Stock    int     `json:"stock"`
			MenuPic  string  `json:"menu_pic"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		if len(body.Name) == 0 || len(body.Name) > 100 {
			http.Error(w, "Name must be between 1 and 100 characters.", http.StatusBadRequest)
			return
		}
		if body.Price < 0 {
			http.Error(w, "Price must be non-negative", http.StatusBadRequest)
			return
		}
		if body.Stock < 0 {
			http.Error(w, "Stock must be non-negative", http.StatusBadRequest)
			return
		}

		menuID := utils.GenerateRandomString(14)
		menu := models.Menu{
			PlaceID:   placeID,
			Name:      body.Name,
			Price:     body.Price,
			Discount:  body.Discount,
			Stock:     body.Stock,
			MenuID:    menuID,
			MenuPhoto: body.MenuPic,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}

		if err := app.DB.Insert(ctx, menuCollection, menu); err != nil {
			http.Error(w, "Failed to insert menu: "+err.Error(), http.StatusInternalServerError)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.MenuCreatedEvent, mqevent.MenuCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"ok":      true,
			"message": "Menu created successfully.",
			"data":    menu,
		})
	}
}

// EditMenu edits an existing menu item
func EditMenu(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		placeID := ps.ByName("placeid")
		menuID := ps.ByName("menuid")

		var menu models.Menu
		if err := json.NewDecoder(r.Body).Decode(&menu); err != nil {
			http.Error(w, "Invalid input data", http.StatusBadRequest)
			return
		}

		if menu.Name == "" || menu.Price < 0 || menu.Stock < 0 {
			http.Error(w, "Invalid menu data", http.StatusBadRequest)
			return
		}

		updateFields := map[string]any{}
		if menu.Name != "" {
			updateFields["name"] = menu.Name
		}
		if menu.Price >= 0 {
			updateFields["price"] = menu.Price
		}
		if menu.Discount >= 0 {
			updateFields["discount"] = menu.Discount
		}
		if menu.Stock >= 0 {
			updateFields["stock"] = menu.Stock
		}

		// Update using Database interface
		if err := app.DB.UpdateOne(ctx, menuCollection, map[string]string{"placeid": placeID, "menuid": menuID}, map[string]any{"$set": updateFields}); err != nil {
			http.Error(w, fmt.Sprintf("Failed to update menu: %v", err), http.StatusInternalServerError)
			return
		}

		// Invalidate cache
		app.Cache.Del(ctx, fmt.Sprintf("menu:%s:%s", placeID, menuID))

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.MenuUpdatedEvent, mqevent.MenuUpdatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Menu updated successfully",
		})
	}
}

// DeleteMenu deletes a menu item
func DeleteMenu(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dels.DeleteMenu(app) // keeps your existing deletion logic

		// Optionally, fully interface-driven version:
		/*
				ctx := r.Context()
				placeID := ps.ByName("placeid")
				menuID := ps.ByName("menuid")

				if err := app.DB.DeleteOne(ctx, "menu", map[string]string{"placeid": placeID, "menuid": menuID}); err != nil {
					http.Error(w, fmt.Sprintf("Failed to delete menu: %v", err), http.StatusInternalServerError)
					return
				}

				app.cache.Del(ctx, fmt.Sprintf("menu:%s:%s", placeID, menuID))

			mqpayload, _ := json.Marshal(mqevent.MenuDeletedPayload{})
			app.MQ.Publish(ctx, mqevent.MenuDeletedEvent, mqpayload)

				utils.RespondWithJSON(w, http.StatusOK, map[string]any{
					"success": true,
					"message": "Menu deleted successfully",
				})
		*/
	}
}
