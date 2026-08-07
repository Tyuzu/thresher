package merch

import "time"

type Merch struct {
	MerchID string `json:"merchid" bson:"merchid"`
	// EventID     string             `json:"eventid" bson:"eventid"` // Reference to Event ID
	Name        string     `json:"name" bson:"name"`
	Slug        string     `json:"slug,omitempty" bson:"slug,omitempty"`         // URL-friendly name (e.g. "concert-tshirt")
	SKU         string     `json:"sku,omitempty" bson:"sku,omitempty"`           // Stock Keeping Unit, unique per product
	Category    string     `json:"category,omitempty" bson:"category,omitempty"` // e.g. “T-Shirts”, “Accessories”
	Price       float64    `json:"price" bson:"price"`
	Discount    float64    `json:"discount,omitempty" bson:"discount,omitempty"`         // e.g. 0.10 for 10% off
	Stock       int        `json:"stock" bson:"stock"`                                   // Number of items available
	StockStatus string     `json:"stock_status,omitempty" bson:"stock_status,omitempty"` // e.g. “In Stock”, “Out of Stock”, “Preorder”
	MerchPhoto  string     `json:"merch_pic" bson:"merch_pic"`
	Gallery     []string   `json:"gallery,omitempty" bson:"gallery,omitempty"` // Additional image filenames
	EntityID    string     `json:"entity_id" bson:"entity_id"`
	EntityType  string     `json:"entity_type" bson:"entity_type"` // “event” or “place”
	Description string     `json:"description,omitempty" bson:"description,omitempty"`
	ShortDesc   string     `json:"short_desc,omitempty" bson:"short_desc,omitempty"` // One-line summary
	Rating      float64    `json:"rating,omitempty" bson:"rating,omitempty"`         // Average rating (0.0–5.0)
	ReviewCount int        `json:"review_count,omitempty" bson:"review_count,omitempty"`
	Weight      float64    `json:"weight,omitempty" bson:"weight,omitempty"`         // In kilograms/pounds
	Dimensions  string     `json:"dimensions,omitempty" bson:"dimensions,omitempty"` // e.g. “30×20×2 cm”
	Tags        []string   `json:"tags,omitempty" bson:"tags,omitempty"`             // e.g. ["rock", "tshirt"]
	CreatedAt   time.Time  `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" bson:"updatedAt"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" bson:"deletedAt,omitempty"` // Soft delete timestamp
	UserID      string     `bson:"userid" json:"userid"`
}
