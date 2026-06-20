package models

type PlaceSuggestion struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Banner   string `json:"banner"`
	Category string `json:"category"`
}

type UserSuggestion struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}
