package ads

import (
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"net/http"
	"sync"
	"time"

	"scav/infra"
	"scav/utils"
)

var (
	adsMutex sync.RWMutex
)

// GetAds handles the API request to fetch an ad for a specific slot.
func GetAds(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		ctx := r.Context()

		category := r.URL.Query().Get("category")
		page := r.URL.Query().Get("page")
		position := r.URL.Query().Get("position")

		cacheCategory := category
		if cacheCategory == "" {
			cacheCategory = "default"
		}

		cachePage := page
		if cachePage == "" {
			cachePage = "default"
		}

		cachePosition := position
		if cachePosition == "" {
			cachePosition = "default"
		}

		cacheKey := fmt.Sprintf(
			"ads:%s:%s:%s",
			cachePage,
			cachePosition,
			cacheCategory,
		)

		var candidates []Ad

		// ---------------------------------------------------------
		// 1. Direct Fetch from Redis Cache
		// ---------------------------------------------------------
		if app != nil && app.Cache != nil {
			if cachedBytes, err := app.Cache.Get(ctx, cacheKey); err == nil && len(cachedBytes) > 0 {
				var cachedAds []Ad
				if err := json.Unmarshal(cachedBytes, &cachedAds); err == nil {
					candidates = cachedAds
				}
			}
		}

		// ---------------------------------------------------------
		// 2. Fallback to Database (MongoDB)
		// ---------------------------------------------------------
		if len(candidates) == 0 {
			dbAds, err := FetchActiveAdsFromDB(ctx, app)

			if err == nil && len(dbAds) > 0 {
				for _, ad := range dbAds {
					matchCategory := category == "" || category == "default" || ad.Category == category
					matchPage := page == "" || ad.Page == page
					matchPosition := position == "" || ad.Position == position

					if matchCategory && matchPage && matchPosition {
						candidates = append(candidates, ad)
					}
				}

				if len(candidates) > 0 && app != nil && app.Cache != nil {
					if data, err := json.Marshal(candidates); err == nil {
						_ = app.Cache.Set(ctx, cacheKey, data, 10*time.Minute)
					}
				}
			}
		}

		// ---------------------------------------------------------
		// 3. Fallback to Safe Defaults
		// ---------------------------------------------------------
		if len(candidates) == 0 {
			defaults := getSafeDefaultAds()

			for _, ad := range defaults {
				matchCategory := category == "" || category == "default" || ad.Category == category
				matchPage := page == "" || ad.Page == page
				matchPosition := position == "" || ad.Position == position

				if matchCategory && matchPage && matchPosition {
					candidates = append(candidates, ad)
				}
			}

			if len(candidates) == 0 {
				candidates = defaults
			}

			if app != nil && app.Cache != nil && len(candidates) > 0 {
				if data, err := json.Marshal(candidates); err == nil {
					_ = app.Cache.Set(ctx, cacheKey, data, 1*time.Minute)
				}
			}
		}

		// ---------------------------------------------------------
		// 4. Return Ad or Error
		// ---------------------------------------------------------
		if len(candidates) == 0 {
			utils.RespondWithError(w, http.StatusNotFound, "No ads available")
			return
		}

		selectedAd := candidates[rand.N(len(candidates))]
		utils.RespondWithJSON(w, http.StatusOK, selectedAd)
	}
}

// TrackImpression logs ad visibility events (fires via sendBeacon).
func TrackImpression(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		adID := r.URL.Query().Get("id")
		if adID != "" && app != nil && app.Cache != nil {
			_, _ = app.Cache.Incr(r.Context(), "ad:impressions:"+adID)
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "recorded"})
	}
}

// TrackClick logs ad click events (fires via sendBeacon).
func TrackClick(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		adID := r.URL.Query().Get("id")
		if adID != "" && app != nil && app.Cache != nil {
			_, _ = app.Cache.Incr(r.Context(), "ad:clicks:"+adID)
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "recorded"})
	}
}
