package cart

import (
	"naevis/models"
	"time"
)

type removeFromCartRequest struct {
	ItemID     string `json:"itemId"`
	Category   string `json:"category"`
	EntityID   string `json:"entityId,omitempty"`
	EntityType string `json:"entityType,omitempty"`
}

type placeOrderRequest struct {
	Address       string                       `json:"address"`
	Items         map[string][]models.CartItem `json:"items"`
	PaymentMethod string                       `json:"paymentMethod"`
	Coupon        string                       `json:"coupon"`
}

type combinedOrder struct {
	OrderID       string                       `bson:"orderId" json:"orderId"`
	OrderType     string                       `json:"orderType"` // "regular" or "farm"
	UserID        string                       `bson:"userId" json:"userId"`
	FarmID        string                       `json:"farmId,omitempty"`
	Items         map[string][]models.CartItem `bson:"items" json:"items,omitempty"`
	Address       string                       `bson:"address" json:"address,omitempty"`
	PaymentMethod string                       `bson:"paymentMethod" json:"paymentMethod,omitempty"`
	Total         int64                        `bson:"total" json:"total"` // In paise
	Status        string                       `bson:"status" json:"status"`
	CreatedAt     time.Time                    `bson:"createdAt" json:"createdAt"`
	ApprovedBy    []string                     `bson:"approvedBy" json:"approvedBy,omitempty"`
}

type Coupon struct {
	Code       string    `bson:"code" json:"code"`
	Discount   float64   `bson:"discount" json:"discount"` // % value
	ExpiresAt  time.Time `bson:"expiresat" json:"expiresat"`
	Active     bool      `bson:"active" json:"active"`
	EntityID   string    `bson:"entityid" json:"entityid"`
	EntityType string    `bson:"entitytype" json:"entitytype"`
}

type CouponRequest struct {
	Code       string  `json:"code"`
	Cart       float64 `json:"cart"`
	EntityID   string  `json:"entityid"`
	EntityType string  `json:"entitytype"`
}

type createSessionPayload struct {
	Address       string                       `json:"address"`
	Items         map[string][]models.CartItem `json:"items"`
	PaymentMethod string                       `json:"paymentmethod"`
	Coupon        string                       `json:"coupon"`
}

// ItemDetails represents item metadata fetched across various entity collections.
type ItemDetails struct {
	Name       string  `json:"name" bson:"name"`
	Type       string  `json:"type" bson:"type"`
	Category   string  `json:"category" bson:"category"`
	Price      float64 `json:"price" bson:"price"`
	Discount   float64 `json:"discount" bson:"discount"`
	Unit       string  `json:"unit" bson:"unit"`
	EntityID   string  `json:"entity_id" bson:"entity_id"`
	EntityName string  `json:"entity_name" bson:"entity_name"`
	EntityType string  `json:"entity_type" bson:"entity_type"`
	Available  int     `json:"available" bson:"available"`
}
