package cart

import (
	"time"
)

// // CartItem represents a single item in the user's cart.
//
//	type CartItem struct {
//		CartItemID string    `json:"cartItemId" bson:"_id,omitempty"`
//		UserID     string    `json:"userid" bson:"userid"`
//		Category   string    `json:"category" bson:"category"`
//		ItemID     string    `json:"itemId" bson:"itemId"`
//		ItemName   string    `json:"itemName" bson:"itemName"`
//		ItemType   string    `json:"itemType,omitempty" bson:"itemType,omitempty"`
//		Unit       string    `json:"unit,omitempty" bson:"unit,omitempty"`
//		Discount   int64     `json:"discount,omitempty" bson:"discount,omitempty"`
//		EntityID   string    `json:"entityId,omitempty" bson:"entityId,omitempty"`
//		EntityName string    `json:"entityName,omitempty" bson:"entityName,omitempty"`
//		EntityType string    `json:"entityType,omitempty" bson:"entityType,omitempty"`
//		Quantity   int       `json:"quantity" bson:"quantity"`
//		Price      int64     `json:"price,omitempty" bson:"price,omitempty"` // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
//		AddedAt    time.Time `json:"addedAt" bson:"addedAt"`
//	}
type CartItem struct {
	ID string `bson:"_id,omitempty" json:"id,omitempty"`

	UserID string `bson:"userid" json:"-"`

	ItemID   string `bson:"itemId" json:"itemId"`
	ItemType string `bson:"itemType" json:"itemType"`

	EntityID   string `bson:"entityId,omitempty" json:"entityId,omitempty"`
	EntityType string `bson:"entityType,omitempty" json:"entityType,omitempty"`

	ItemName string `bson:"itemName" json:"itemName"`

	Quantity int `bson:"quantity" json:"quantity"`

	/*
		Price and Discount are stored as integer minor units.

		For example:
		₹199.50 -> 19950
	*/
	Price    int64 `bson:"price" json:"price"`
	Discount int64 `bson:"discount" json:"discount"`

	Unit     string `bson:"unit,omitempty" json:"unit,omitempty"`
	Category string `bson:"category,omitempty" json:"category,omitempty"`

	AddedAt   time.Time `bson:"addedAt" json:"addedAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// CheckoutSession represents a pre-order session, grouped by category.
type CheckoutSession struct {
	UserID         string                `json:"userid" bson:"userid"`
	Items          map[string][]CartItem `json:"items" bson:"items"`
	Address        string                `json:"address" bson:"address"`
	Total          int64                 `json:"total" bson:"total"`       // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	Subtotal       int64                 `json:"subtotal" bson:"subtotal"` // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	Tax            int64                 `json:"tax" bson:"tax"`           // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	Delivery       int64                 `json:"delivery" bson:"delivery"` // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	Discount       int64                 `json:"discount" bson:"discount"` // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	PaymentMethod  string                `json:"paymentMethod" bson:"paymentMethod"`
	PaymentDetails interface{}           `json:"paymentDetails" bson:"paymentDetails"`
	CreatedAt      time.Time             `json:"createdAt" bson:"createdAt"`
}

// Order represents a finalized order.
type Order struct {
	OrderID       string                `json:"orderId" bson:"orderId"`
	UserID        string                `json:"userid" bson:"userid"`
	Items         map[string][]CartItem `json:"items" bson:"items"` // grouped by category
	Address       string                `json:"address" bson:"address"`
	PaymentMethod string                `json:"paymentMethod" bson:"paymentMethod"`
	Status        string                `json:"status" bson:"status"` // e.g. "pending", "completed"
	ApprovedBy    []string              `json:"approvedBy" bson:"approvedBy"`
	CreatedAt     time.Time             `json:"createdAt" bson:"createdAt"`
	Subtotal      int64                 `json:"subtotal" bson:"subtotal"`
	Discount      int64                 `json:"discount" bson:"discount"`
	Tax           int64                 `json:"tax" bson:"tax"`
	Delivery      int64                 `json:"delivery" bson:"delivery"`
	Total         int64                 `json:"total" bson:"total"`
}

type FarmOrder struct {
	OrderID         string                `bson:"orderid,omitempty"  json:"orderid"`
	UserID          string                `bson:"userid"         json:"userid"`
	FarmID          string                `bson:"farmid"         json:"farmid"`
	CropID          string                `bson:"cropid"         json:"cropid"`
	Quantity        int                   `bson:"quantity"       json:"quantity"`
	PriceAtPurchase float64               `bson:"priceAtPurchase" json:"priceAtPurchase"`
	CreatedAt       time.Time             `bson:"createdAt"       json:"createdAt"`
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
