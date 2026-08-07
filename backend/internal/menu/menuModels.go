package menu

import "time"

type Menu struct {
	MenuID      string    `json:"menuid" bson:"menuid"`
	PlaceID     string    `json:"placeid" bson:"placeid"` // Reference to Place ID
	Name        string    `json:"name" bson:"name"`
	Price       float64   `json:"price" bson:"price"`
	Discount    float64   `json:"discount,omitempty" bson:"discount,omitempty"`
	Stock       int       `json:"stock" bson:"stock"` // Number of items available
	MenuPhoto   string    `json:"menu_pic" bson:"menu_pic"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
	UserID      string    `bson:"userid" json:"userid"`
	UpdatedAt   time.Time `bson:"updated_at" json:"updatedAt"`
}
