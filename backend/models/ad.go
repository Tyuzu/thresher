package models

// Ad represents the structure of an advertisement.
type Ad struct {
	ID          string `json:"id,omitempty"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	Image       string `json:"image,omitempty"`
	Link        string `json:"link,omitempty"`
	Category    string `json:"category,omitempty"`
}
