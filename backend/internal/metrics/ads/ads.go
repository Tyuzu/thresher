package ads

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"naevis/models" // Ensure models.Ad has Position, Page, and Impression fields if needed
)

// In-memory dummy database (Mutex added for dynamic impression/click counter updates)
var (
	adsMutex sync.RWMutex
	ads      = []models.Ad{
		{
			ID:          "1",
			Title:       "Tech Gadget Sale",
			Description: "Get the latest gadgets at unbeatable prices!",
			Image:       "https://via.placeholder.com/300x250?text=Tech+Ad",
			Link:        "https://example.com/tech-sale",
			Category:    "tech",
			Page:        "home",
			Position:    "aside",
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

func init() {
	rand.Seed(time.Now().UnixNano())
}

// GetAds fetches ads matching target parameters and returns a single dynamically picked ad slot payload.
func GetAds(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	category := r.URL.Query().Get("category")
	page := r.URL.Query().Get("page")
	position := r.URL.Query().Get("position")

	adsMutex.RLock()
	var candidates []models.Ad

	for _, ad := range ads {
		// Filter match checks
		matchCategory := category == "" || category == "default" || ad.Category == category
		matchPage := page == "" || ad.Page == page
		matchPosition := position == "" || ad.Position == position

		if matchCategory && matchPage && matchPosition {
			candidates = append(candidates, ad)
		}
	}
	adsMutex.RUnlock()

	// If no specific slot ad is found, fall back to any available ad
	if len(candidates) == 0 {
		adsMutex.RLock()
		candidates = ads
		adsMutex.RUnlock()
	}

	if len(candidates) == 0 {
		http.Error(w, `{"error":"No ads available"}`, http.StatusNotFound)
		return
	}

	// Pick a random ad from filtered candidates to serve dynamic content on refresh
	selectedAd := candidates[rand.Intn(len(candidates))]

	if err := json.NewEncoder(w).Encode(selectedAd); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
	}
}

// TrackImpression logs ad visibility events from IntersectionObserver
func TrackImpression(w http.ResponseWriter, r *http.Request) {
	adID := r.URL.Query().Get("id")

	if adID != "" {
		adsMutex.Lock()
		// TODO: Increment tracking metric here (e.g., db update)
		inc()
		// TODO: Increment tracking metric here (e.g., db update)
		adsMutex.Unlock()
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "recorded"})
}

func inc() {

}
