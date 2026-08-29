package menu

import (
	"context"
	"encoding/json"
	"fmt"
	"scav/infra"
	"scav/utils"
	log "scav/utils/logger"
	"net/http"
	"time"
)

// Fetch a single menu item
func GetMenu(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		placeID := utils.GetParam(r, "placeid")
		menuID := utils.GetParam(r, "menuid")
		cacheKey := fmt.Sprintf("menu:%s:%s", placeID, menuID)

		// Check cache first
		cachedMenu, err := app.Cache.Get(ctx, cacheKey)
		if err == nil && len(cachedMenu) != 0 {
			w.Header().Set("Content-Type", "application/json")
			if _, err := w.Write([]byte(cachedMenu)); err != nil { // #nosec G104
				log.Printf("failed to write cached menu: %v", err)
			}
			return
		}

		var menu Menu
		err = app.DB.FindOne(ctx, menuCollection, map[string]string{
			"placeid": placeID,
			"menuid":  menuID,
		}, &menu)
		if err != nil {
			http.Error(w, fmt.Sprintf("Menu not found: %v", err), http.StatusNotFound)
			return
		}

		menuJSON, _ := json.Marshal(menu)
		if err := app.Cache.Set(ctx, cacheKey, menuJSON, 1*time.Hour); err != nil { // #nosec G104
			log.Printf("failed to cache menu: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, menu)
	}
}

// Fetch stock of a single menu
func GetStock(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		placeID := utils.GetParam(r, "placeid")
		menuID := utils.GetParam(r, "menuid")

		var menu Menu
		err := app.DB.FindOne(r.Context(), menuCollection, map[string]string{
			"placeid": placeID,
			"menuid":  menuID,
		}, &menu)
		if err != nil {
			http.Error(w, fmt.Sprintf("Menu not found: %v", err), http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, menu)
	}
}

// Fetch all menus for a place
func GetMenus(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var menus []Menu
		err := app.DB.FindMany(ctx, menuCollection, map[string]string{
			"placeid": utils.GetParam(r, "placeid"),
		}, &menus)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch menus")
			return
		}

		if menus == nil {
			menus = []Menu{}
		}
		utils.RespondWithJSON(w, http.StatusOK, menus)
	}
}
