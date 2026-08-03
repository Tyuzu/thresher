package models

type IngredientAlternative struct {
	Name   string `json:"name" bson:"name"`
	ItemID string `json:"itemId" bson:"itemId"`
	Type   string `json:"type" bson:"type"`
}

type Ingredient struct {
	Name         string                  `json:"name" bson:"name"`
	ItemID       string                  `json:"itemId" bson:"itemId"`
	Type         string                  `json:"type" bson:"type"`
	Quantity     float64                 `json:"quantity" bson:"quantity"`
	Unit         string                  `json:"unit" bson:"unit"`
	Alternatives []IngredientAlternative `json:"alternatives" bson:"alternatives"`
}

type Recipe struct {
	RecipeId    string       `bson:"recipeid,omitempty" json:"recipeid"`
	UserID      string       `json:"userid" bson:"userid"`
	Title       string       `json:"title" bson:"title"`
	Description string       `json:"description" bson:"description"`
	CookTime    string       `json:"cooktime" bson:"cooktime"`       // replaced PrepTime
	Cuisine     string       `json:"cuisine" bson:"cuisine"`         // new
	Dietary     []string     `json:"dietary" bson:"dietary"`         // new
	PortionSize string       `json:"portionsize" bson:"portionsize"` // new
	Season      string       `json:"season" bson:"season"`           // new
	Tags        []string     `json:"tags" bson:"tags"`
	Images      []string     `json:"images" bson:"images"`
	Ingredients []Ingredient `json:"ingredients" bson:"ingredients"`
	Steps       []string     `json:"steps" bson:"steps"`
	Difficulty  string       `json:"difficulty" bson:"difficulty"`
	Banner      string       `json:"banner" bson:"banner"`
	Servings    int          `json:"servings" bson:"servings"`
	VideoURL    string       `json:"videourl" bson:"videourl"` // new
	Notes       string       `json:"notes" bson:"notes"`       // new
	CreatedAt   int64        `json:"createdat" bson:"createdat"`
	Views       int          `json:"views" bson:"views"`
}
