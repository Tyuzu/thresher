package models

import "time"

// RefundRequest represents a user's request to refund an order
type OrderRefundRequest struct {
	ID            string `bson:"_id,omitempty" json:"id"`
	OrderID       string `bson:"orderid" json:"orderid"`                                 // Order being refunded
	UserID        string `bson:"userid" json:"userid"`                                   // User requesting refund
	OrderType     string `bson:"ordertype" json:"ordertype"`                             // "regular" or "farm"
	Amount        int64  `bson:"amount" json:"amount"`                                   // Refund amount in paise
	Reason        string `bson:"reason" json:"reason"`                                   // Reason for refund request
	Status        string `bson:"status" json:"status"`                                   // "pending", "approved", "rejected", "completed"
	TransactionID string `bson:"transactionid,omitempty" json:"transactionid,omitempty"` // Created refund transaction ID

	// Admin review info
	ReviewedBy  string    `bson:"reviewedby,omitempty" json:"reviewedby,omitempty"`   // Admin user ID who reviewed
	ReviewedAt  time.Time `bson:"reviewedat,omitempty" json:"reviewedat,omitempty"`   // When refund was reviewed
	ReviewNotes string    `bson:"reviewnotes,omitempty" json:"reviewnotes,omitempty"` // Admin notes on refund

	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt time.Time `bson:"updatedat" json:"updatedat"`
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
