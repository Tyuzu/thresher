package python

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Shared HTTP client with a short timeout so a slow Python server doesn't delay the API response.
var pythonHTTPClient = &http.Client{
	Timeout: 2 * time.Second,
}

// fetchAdsFromPython fetches active ads from the local Python Flask service.
func FetchAdsFromPython(ctx context.Context) ([]Ad, error) {
	endpoint := "http://127.0.0.1:5000/api/ads" // Adjust Flask host/port
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create python request: %w", err)
	}

	resp, err := pythonHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("python request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("python server returned status: %d", resp.StatusCode)
	}

	var fetchedAds []Ad
	if err := json.NewDecoder(resp.Body).Decode(&fetchedAds); err != nil {
		return nil, fmt.Errorf("decode python ads: %w", err)
	}

	return fetchedAds, nil
}

// Ad represents the structure of an advertisement for JSON and MongoDB.
type Ad struct {
	ID          string `json:"id,omitempty" bson:"_id,omitempty"`
	Title       string `json:"title,omitempty" bson:"title,omitempty"`
	Description string `json:"description,omitempty" bson:"description,omitempty"`
	Image       string `json:"image,omitempty" bson:"image,omitempty"`
	Link        string `json:"link,omitempty" bson:"link,omitempty"`
	Category    string `json:"category,omitempty" bson:"category,omitempty"`
	Page        string `json:"page,omitempty" bson:"page,omitempty"`
	Position    string `json:"position,omitempty" bson:"position,omitempty"`
}
