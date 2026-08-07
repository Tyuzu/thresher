package ads

import (
	"encoding/json"
	"math/rand/v2"
	"net/http"
	"sync"
	"time"

	"naevis/infra"
)

const adsCacheKey = "ads:all"

var (
	adsMutex   sync.RWMutex
	defaultAds = []Ad{
		{
			ID:          "1",
			Title:       "Tech Gadget Sale",
			Description: "Get the latest gadgets at unbeatable prices!",
			Image:       "https://via.placeholder.com/300x250?text=Tech+Ad",
			Link:        "https://example.com/tech-sale",
			Category:    "tech",
			Page:        "recipes",
			Position:    "inbody",
		},
		{
			ID:          "2",
			Title:       "Travel Deals",
			Description: "Explore the world with our exclusive travel packages.",
			Image:       "https://via.placeholder.com/300x250?text=Travel+Ad",
			Link:        "https://example.com/travel-deals",
			Category:    "travel",
			Page:        "home",
			Position:    "aside",
		},
		{
			ID:          "3",
			Title:       "Local Restaurant",
			Description: "Taste the best food in town at amazing discounts.",
			Image:       "https://via.placeholder.com/728x90?text=Food+Banner",
			Link:        "https://example.com/restaurant",
			Category:    "food",
			Page:        "home",
			Position:    "main-bottom",
		},
	}
)

// GetAds handles the API request to fetch an ad.
func GetAds(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		ctx := r.Context()
		category := r.URL.Query().Get("category")
		page := r.URL.Query().Get("page")
		position := r.URL.Query().Get("position")

		var activeAds []Ad

		// 1. Try Cache
		if app != nil && app.Cache != nil {
			if cachedBytes, err := app.Cache.Get(ctx, adsCacheKey); err == nil && len(cachedBytes) > 0 {
				_ = json.Unmarshal(cachedBytes, &activeAds)
			}
		}

		// 2. Fallback to Database using decoupled repository function
		if len(activeAds) == 0 {
			dbAds, err := FetchActiveAdsFromDB(ctx, app)
			if err == nil && len(dbAds) > 0 {
				activeAds = dbAds

				// Populate Cache with DB records for subsequent requests
				if app != nil && app.Cache != nil {
					if data, err := json.Marshal(activeAds); err == nil {
						_ = app.Cache.Set(ctx, adsCacheKey, data, 10*time.Minute)
					}
				}
			}
		}

		// 3. Fallback to hardcoded defaults if DB yields nothing
		if len(activeAds) == 0 {
			adsMutex.RLock()
			activeAds = append(activeAds, defaultAds...)
			adsMutex.RUnlock()

			if app != nil && app.Cache != nil {
				if data, err := json.Marshal(activeAds); err == nil {
					_ = app.Cache.Set(ctx, adsCacheKey, data, 1*time.Minute)
				}
			}
		}

		// 4. Business Logic: Filter candidate ads based on query criteria
		var candidates []Ad
		for _, ad := range activeAds {
			matchCategory := category == "" || category == "default" || ad.Category == category
			matchPage := page == "" || ad.Page == page
			matchPosition := position == "" || ad.Position == position

			if matchCategory && matchPage && matchPosition {
				candidates = append(candidates, ad)
			}
		}

		if len(candidates) == 0 {
			candidates = activeAds
		}

		if len(candidates) == 0 {
			http.Error(w, `{"error":"No ads available"}`, http.StatusNotFound)
			return
		}

		selectedAd := candidates[rand.N(len(candidates))]

		_ = json.NewEncoder(w).Encode(selectedAd)
	}
}

// TrackImpression logs ad visibility events using app.Cache counter
func TrackImpression(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adID := r.URL.Query().Get("id")

		if adID != "" && app != nil && app.Cache != nil {
			_, _ = app.Cache.Incr(r.Context(), "ad:impressions:"+adID)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "recorded"})
	}
}
