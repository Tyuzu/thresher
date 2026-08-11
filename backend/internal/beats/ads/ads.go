package ads

import (
	"encoding/json"
	"math/rand/v2"
	"net/http"
	"sync"
	"time"

	"naevis/infra"
	"naevis/python"
)

const adsCacheKey = "ads:all"

var (
	adsMutex   sync.RWMutex
	defaultAds = []python.Ad{
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

// getSafeDefaultAds returns a thread-safe copy of default ads.
func getSafeDefaultAds() []python.Ad {
	adsMutex.RLock()
	defer adsMutex.RUnlock()

	copied := make([]python.Ad, len(defaultAds))
	copy(copied, defaultAds)
	return copied
}

// GetAds handles the API request to fetch an ad slot item.
func GetAds(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		ctx := r.Context()
		category := r.URL.Query().Get("category")
		page := r.URL.Query().Get("page")
		position := r.URL.Query().Get("position")

		var activeAds []python.Ad

		// 1. Fetch from Cache
		if app != nil && app.Cache != nil {
			if cachedBytes, err := app.Cache.Get(ctx, adsCacheKey); err == nil && len(cachedBytes) > 0 {
				_ = json.Unmarshal(cachedBytes, &activeAds)
			}
		}

		// 2. Fetch from Python Server (if Cache Miss)
		if len(activeAds) == 0 {
			if pyAds, err := python.FetchAdsFromPython(ctx); err == nil && len(pyAds) > 0 {
				activeAds = pyAds

				if app != nil && app.Cache != nil {
					if data, err := json.Marshal(activeAds); err == nil {
						_ = app.Cache.Set(ctx, adsCacheKey, data, 5*time.Minute)
					}
				}
			}
		}

		// 3. Fallback to Database
		if len(activeAds) == 0 {
			dbAds, err := FetchActiveAdsFromDB(ctx, app)
			if err == nil && len(dbAds) > 0 {
				activeAds = dbAds

				if app != nil && app.Cache != nil {
					if data, err := json.Marshal(activeAds); err == nil {
						_ = app.Cache.Set(ctx, adsCacheKey, data, 10*time.Minute)
					}
				}
			}
		}

		// 4. Fallback to Hardcoded Defaults
		if len(activeAds) == 0 {
			activeAds = getSafeDefaultAds()

			if app != nil && app.Cache != nil {
				if data, err := json.Marshal(activeAds); err == nil {
					_ = app.Cache.Set(ctx, adsCacheKey, data, 1*time.Minute)
				}
			}
		}

		// 5. Candidate Filtering
		var candidates []python.Ad
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
