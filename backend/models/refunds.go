package models

import "time"

// RefundRequest represents a user's request to refund an order
type OrderRefundRequest struct {
	ID            string `bson:"_id,omitempty" json:"id"`
	OrderID       string `bson:"order_id" json:"order_id"`                                 // Order being refunded
	UserID        string `bson:"user_id" json:"user_id"`                                   // User requesting refund
	OrderType     string `bson:"order_type" json:"order_type"`                             // "regular" or "farm"
	Amount        int64  `bson:"amount" json:"amount"`                                     // Refund amount in paise
	Reason        string `bson:"reason" json:"reason"`                                     // Reason for refund request
	Status        string `bson:"status" json:"status"`                                     // "pending", "approved", "rejected", "completed"
	TransactionID string `bson:"transaction_id,omitempty" json:"transaction_id,omitempty"` // Created refund transaction ID

	// Admin review info
	ReviewedBy  string    `bson:"reviewed_by,omitempty" json:"reviewed_by,omitempty"`   // Admin user ID who reviewed
	ReviewedAt  time.Time `bson:"reviewed_at,omitempty" json:"reviewed_at,omitempty"`   // When refund was reviewed
	ReviewNotes string    `bson:"review_notes,omitempty" json:"review_notes,omitempty"` // Admin notes on refund

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// RefundRequestFilter helps filter refund requests
type RefundRequestFilter struct {
	UserID    string
	OrderID   string
	Status    string
	OrderType string
	Skip      int
	Limit     int
}
