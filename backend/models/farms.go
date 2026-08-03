package models

import (
	"fmt"
	"time"
)

type ContactInfo struct {
	Phone   string `bson:"phone,omitempty" json:"phone,omitempty"`
	Email   string `bson:"email,omitempty" json:"email,omitempty"`
	Website string `bson:"website,omitempty" json:"website,omitempty"`
}

type AvailableSlot struct {
	Enabled bool   `json:"enabled" bson:"enabled"`
	From    string `json:"from" bson:"from"`
	To      string `json:"to" bson:"to"`
}

type WeeklyAvailability map[string]AvailableSlot

type Farm struct {
	FarmID         string             `bson:"farmid,omitempty"         json:"farmid"`
	Name           string             `bson:"name"                  json:"name"`
	Location       string             `bson:"location"              json:"location"`
	Latitude       float64            `bson:"latitude,omitempty"    json:"latitude,omitempty"`
	Longitude      float64            `bson:"longitude,omitempty"   json:"longitude,omitempty"`
	Description    string             `bson:"description,omitempty" json:"description,omitempty"`
	Owner          string             `bson:"owner"                 json:"owner"`
	ContactInfo    ContactInfo        `bson:"contactinfo,omitempty" json:"contactinfo,omitempty"`
	Availability   WeeklyAvailability `json:"availability" bson:"availability"`
	Tags           []string           `bson:"tags,omitempty"        json:"tags,omitempty"`
	Banner         string             `bson:"banner,omitempty"       json:"photo,omitempty"`
	Crops          []Crop             `bson:"crops" json:"crops,omitempty"` // loaded via lookup or separate query
	Media          []string           `bson:"media,omitempty"       json:"media,omitempty"`
	AvgRating      float64            `bson:"avgrating,omitempty"   json:"avgrating,omitempty"`
	ReviewCount    int                `bson:"reviewcount,omitempty" json:"reviewcount,omitempty"`
	FavoritesCount int64              `bson:"favoritescount,omitempty" json:"favoritescount,omitempty"`
	CreatedBy      string             `bson:"createdby"             json:"createdby"`
	CreatedAt      time.Time          `bson:"createdat"             json:"createdat"`
	UpdatedAt      time.Time          `bson:"updatedat"             json:"updatedat"`
	Contact        string             `json:"contact"`

	Social   string `json:"social,omitempty" bson:"social,omitempty"`
	Practice string `json:"practice,omitempty" bson:"practice,omitempty"`
}

type PricePoint struct {
	Date  time.Time `json:"date" bson:"date"`
	Price float64   `json:"price" bson:"price"`
}

type Crop struct {
	Name         string       `json:"name"`
	CropId       string       `json:"cropid"`
	Price        float64      `json:"price"`
	Discount     float64      `json:"discount,omitempty" bson:"discount,omitempty"`
	Quantity     int          `json:"quantity"`
	Unit         string       `json:"unit"`
	Banner       string       `bson:"banner" json:"banner"`
	Notes        string       `json:"notes,omitempty"`
	Category     string       `json:"category,omitempty"`
	CatalogueId  string       `json:"catalogueid,omitempty"`
	Featured     bool         `json:"featured,omitempty"`
	OutOfStock   bool         `json:"outofstock,omitempty"`
	HarvestDate  *time.Time   `bson:"harvestdate,omitempty"`
	PlantedDate  time.Time    `bson:"planteddate,omitempty"`
	LastSoldAt   time.Time    `bson:"lastsoldat,omitempty"`
	ExpiryDate   *time.Time   `json:"expirydate,omitempty"`
	UpdatedAt    time.Time    `json:"updatedat"`
	PriceHistory []PricePoint `json:"pricehistory,omitempty"`
	FieldPlot    string       `json:"fieldplot,omitempty"`
	CreatedAt    time.Time    `json:"createdat"`
	CreatedBy    string       `json:"createdby"`
	FarmID       string       `bson:"farmid,omitempty" json:"farmid,omitempty"`
	FarmName     string       `json:"farmname,omitempty"` // CRITICAL FIX: Add farm name for cart/display
}

type IncomingOrder struct {
	ID           string `json:"id"`
	Buyer        string `json:"buyer"`
	Contact      string `json:"contact"`
	Crop         string `json:"crop"`
	Qty          int    `json:"qty"`
	Unit         string `json:"unit"`
	OrderDate    string `json:"orderdate"`
	DeliveryDate string `json:"deliverydate"`
	Address      string `json:"address"`
	Payment      string `json:"payment"`
	Status       string `json:"status"`
}

type FarmOrder struct {
	OrderID         string                `bson:"orderid,omitempty"  json:"orderid"`
	UserID          string                `bson:"userid"         json:"userid"`
	FarmID          string                `bson:"farmid"         json:"farmid"`
	CropID          string                `bson:"cropid"         json:"cropid"`
	Quantity        int                   `bson:"quantity"       json:"quantity"`
	PriceAtPurchase float64               `bson:"priceatpurchase" json:"priceatpurchase"`
	CreatedAt       time.Time             `bson:"createdat"       json:"createdat"`
	Status          OrderStatus           `bson:"status"       json:"status"`
	ApprovedBy      []string              `bson:"approved"       json:"approved"`
	Items           map[string][]CartItem `json:"items" bson:"items"`
	Subtotal        int64                 `json:"subtotal" bson:"subtotal"`
	Discount        int64                 `json:"discount" bson:"discount"`
	Tax             int64                 `json:"tax" bson:"tax"`
	Delivery        int64                 `json:"delivery" bson:"delivery"`
	Total           int64                 `json:"total" bson:"total"`
	Address         string                `json:"address" bson:"address"`
	Name            string                `json:"name" bson:"name"`
	Phone           string                `json:"phone" bson:"phone"`
}

type OrderStatus string

const (
	OrderActive   OrderStatus = "active"
	OrderRejected OrderStatus = "rejected"
	OrderClosed   OrderStatus = "closed"
)

type CropCatalogueItem struct {
	Name       string `json:"name"`
	Category   string `json:"category"`
	Banner     string `bson:"banner" json:"banner"`
	Stock      int    `json:"stock"`
	Unit       string `json:"unit"`
	Featured   bool   `json:"featured"`
	PriceRange []int  `json:"pricerange,omitempty"`
}

type CropListing struct {
	FarmID string `json:"farmid"`
	CropId string `json:"cropid"`

	FarmName string `json:"farmname"`
	Location string `json:"location"`

	Breed string `json:"breed"`

	PricePerKg     float64 `json:"priceperkg"`
	AvailableQtyKg int     `json:"availableqtykg"`
	Unit           string  `json:"unit"`

	HarvestDate string `json:"harvestdate,omitempty"`
	PlantedDate string `json:"planteddate,omitempty"`
	LastSoldAt  string `json:"lastsoldat,omitempty"`

	Featured   bool `json:"featured"`
	OutOfStock bool `json:"outofstock"`

	AvgRating   float64 `json:"avgrating"`
	ReviewCount int     `json:"reviewcount"`

	FavoritesCount int64 `json:"favoritescount"`

	Availability WeeklyAvailability `json:"availability" bson:"availability"`
	Phone        string             `json:"phone,omitempty"`

	InventoryValue float64 `json:"inventoryValue"`

	Tags   []string `json:"tags,omitempty"`
	Banner string   `json:"banner"`
}

type Product struct {
	ProductID   string   `bson:"productid,omitempty" json:"productid"`
	UserID      string   `bson:"userid" json:"userid"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Price       float64  `json:"price"`
	Discount    float64  `json:"discount,omitempty" bson:"discount,omitempty"`
	Unit        string   `json:"unit"`
	Images      []string `json:"images"`
	Category    string   `bson:"category" json:"category"`
	Quantity    float64  `bson:"quantity" json:"quantity"`
	Type        string   `bson:"type" json:"type"`
	Photo       string   `bson:"photo,omitempty" json:"photo,omitempty"`
	Banner      string   `bson:"banner,omitempty" json:"banner,omitempty"`

	// Physical product fields
	Size        string            `json:"size,omitempty"`
	Color       string            `json:"color,omitempty"`
	Ingredients string            `json:"ingredients,omitempty"`
	ExpiryDate  string            `json:"expiryDate,omitempty"`
	Weight      string            `json:"weight,omitempty"`
	Specs       map[string]string `json:"specs,omitempty"`

	// Media fields
	Author     string `json:"author,omitempty"`     // book
	ISBN       string `json:"isbn,omitempty"`       // book
	Platform   string `json:"platform,omitempty"`   // software
	Version    string `json:"version,omitempty"`    // software
	License    string `json:"license,omitempty"`    // software
	Instructor string `json:"instructor,omitempty"` // course
	Duration   string `json:"duration,omitempty"`   // course / subscription

	// Subscription fields
	BillingCycle string `json:"billingCycle,omitempty"`
	TrialPeriod  string `json:"trialPeriod,omitempty"`
	Scope        string `json:"scope,omitempty"`

	// Creative / art
	Artist     string `json:"artist,omitempty"`
	Medium     string `json:"medium,omitempty"`
	Dimensions string `json:"dimensions,omitempty"`

	// Vehicle fields
	Engine   string `json:"engine,omitempty"`
	Mileage  string `json:"mileage,omitempty"`
	FuelType string `json:"fuelType,omitempty"`

	Featured      bool      `json:"featured,omitempty"`
	SKU           string    `json:"sku,omitempty"`
	AvailableFrom *SafeTime `bson:"availableFrom,omitempty" json:"availableFrom,omitempty"`
	AvailableTo   *SafeTime `bson:"availableTo,omitempty" json:"availableTo,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type SafeTime struct {
	time.Time
}

type Tool struct {
	ToolID        string    `bson:"toolid,omitempty" json:"toolid"`
	Name          string    `bson:"name" json:"name"`
	Price         float64   `bson:"price" json:"price"`
	Discount      float64   `bson:"discount,omitempty" json:"discount,omitempty"`
	Description   string    `bson:"description" json:"description"`
	Banner        string    `bson:"banner" json:"banner"`
	Category      string    `bson:"category" json:"category"`
	SKU           string    `bson:"sku,omitempty" json:"sku,omitempty"`
	AvailableFrom *SafeTime `bson:"availablefrom,omitempty" json:"availablefrom,omitempty"`
	AvailableTo   *SafeTime `bson:"availableto,omitempty" json:"availableto,omitempty"`
	Quantity      float64   `bson:"quantity" json:"quantity"`
	Unit          string    `bson:"unit" json:"unit"`
	Featured      bool      `bson:"featured" json:"featured"`
}

// UnmarshalJSON tries RFC3339, then "2006-01-02"
func (st *SafeTime) UnmarshalJSON(b []byte) error {
	s := string(b)
	// strip quotes
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}
	if s == "" || s == "null" {
		// leave st.Time zero or nil
		return nil
	}
	// Try full RFC3339 first
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		st.Time = t
		return nil
	}
	// Fallback to date-only
	if t, err := time.Parse("2006-01-02", s); err == nil {
		st.Time = t
		return nil
	}
	return fmt.Errorf("invalid date format: %q", s)
}
