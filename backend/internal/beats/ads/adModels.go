package ads

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
