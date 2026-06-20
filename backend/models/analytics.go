package models

import "time"

// Analytics represents extended analytics data for any entity
type Analytics struct {
	ID           string                 `json:"id"`
	Name         string                 `json:"name"`
	Type         string                 `json:"type"` // "event", "place", "product", etc.
	Metrics      map[string]int         `json:"metrics"`
	Trend        []int                  `json:"trend"`        // last 7 days of activity
	TopLocations []string               `json:"topLocations"` // relevant for places
	Engagement   map[string]interface{} `json:"engagement"`   // e.g., avg time, bounce rate
	Insights     map[string]string      `json:"insights"`     // textual summaries
	LastUpdated  time.Time              `json:"lastUpdated"`
}
