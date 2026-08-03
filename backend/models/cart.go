package models

import "time"

// CartItem represents a single item in the user's cart.
type CartItem struct {
	CartItemID string    `json:"cartitemid" bson:"_id,omitempty"`
	UserID     string    `json:"userid" bson:"userid"`
	Category   string    `json:"category" bson:"category"`
	ItemID     string    `json:"itemid" bson:"itemid"`
	ItemName   string    `json:"itemname" bson:"itemname"`
	ItemType   string    `json:"itemtype,omitempty" bson:"itemtype,omitempty"`
	Unit       string    `json:"unit,omitempty" bson:"unit,omitempty"`
	Discount   int64     `json:"discount,omitempty" bson:"discount,omitempty"`
	EntityID   string    `json:"entityid,omitempty" bson:"entityid,omitempty"`
	EntityName string    `json:"entityname,omitempty" bson:"entityname,omitempty"`
	EntityType string    `json:"entitytype,omitempty" bson:"entitytype,omitempty"`
	Quantity   int       `json:"quantity" bson:"quantity"`
	Price      int64     `json:"price,omitempty" bson:"price,omitempty"` // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	AddedAt    time.Time `json:"addedat" bson:"addedat"`
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
	PaymentMethod  string                `json:"paymentmethod" bson:"paymentmethod"`
	PaymentDetails interface{}           `json:"paymentdetails" bson:"paymentdetails"`
	CreatedAt      time.Time             `json:"createdat" bson:"createdat"`
}

// Order represents a finalized order.
type Order struct {
	OrderID       string                `json:"orderid" bson:"orderid"`
	UserID        string                `json:"userid" bson:"userid"`
	Items         map[string][]CartItem `json:"items" bson:"items"` // grouped by category
	Address       string                `json:"address" bson:"address"`
	PaymentMethod string                `json:"paymentmethod" bson:"paymentmethod"`
	Status        string                `json:"status" bson:"status"` // e.g. "pending", "completed"
	ApprovedBy    []string              `json:"approvedby" bson:"approvedby"`
	CreatedAt     time.Time             `json:"createdat" bson:"createdat"`
	Subtotal      int64                 `json:"subtotal" bson:"subtotal"`
	Discount      int64                 `json:"discount" bson:"discount"`
	Tax           int64                 `json:"tax" bson:"tax"`
	Delivery      int64                 `json:"delivery" bson:"delivery"`
	Total         int64                 `json:"total" bson:"total"`
}
