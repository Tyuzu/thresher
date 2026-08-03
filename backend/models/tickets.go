package models

import (
	"time"
)

type RefundRequest struct {
	EventID     string     `bson:"eventid" json:"eventid"`
	TicketID    string     `bson:"ticketid" json:"ticketid"`
	UserID      string     `bson:"userid" json:"userid"`
	UniqueCode  string     `bson:"uniquecode" json:"uniquecode"`
	RequestDate time.Time  `bson:"requestdate" json:"requestdate"`
	Status      string     `bson:"status" json:"status"` // pending, approved, rejected, refunded
	Amount      int        `bson:"amount" json:"amount,omitempty"`
	ProcessedAt *time.Time `bson:"processedat,omitempty" json:"processedat,omitempty"`
	RefundedAt  *time.Time `bson:"refundedat,omitempty" json:"refundedat,omitempty"`
}

type Ticket struct {
	TicketID    string    `json:"ticketid" bson:"ticketid"`
	EventID     string    `json:"eventid" bson:"eventid"`
	Name        string    `json:"name" bson:"name"`
	Price       int64     `json:"price" bson:"price"` // CRITICAL FIX: Changed from float64 to int64 (stored in paise)
	Currency    string    `json:"currency" bson:"currency"`
	Color       string    `json:"color" bson:"color"`
	Quantity    int       `json:"quantity" bson:"quantity"`
	EntityID    string    `json:"entityid" bson:"entityid"`
	EntityType  string    `json:"entitytype" bson:"entitytype"` // "event" or "place"
	Available   int       `json:"available" bson:"available"`
	Total       int       `json:"total" bson:"total"`
	CreatedAt   time.Time `json:"createdat" bson:"createdat"`
	Description string    `bson:"description,omitempty" json:"description"`
	Sold        int       `bson:"sold" json:"sold"`
	SeatStart   int       `bson:"seatstart" json:"seatstart"`
	SeatEnd     int       `bson:"seatend" json:"seatend"`
	Seats       []Seat    `bson:"seats" json:"seats"` // 👈 new field
	UpdatedAt   time.Time `bson:"updatedat" json:"updatedat"`
}

type Seat struct {
	SeatID     string `json:"id" bson:"_id,omitempty"`
	EntityID   string `json:"entityid" bson:"entityid"`
	EntityType string `json:"entitytype" bson:"entitytype"` // e.g., "event" or "place"
	SeatNumber string `json:"seatnumber" bson:"seatnumber"`
	UserID     string `json:"userid" bson:"userid,omitempty"`
	Status     string `json:"status" bson:"status"` // e.g., "booked", "available"
}
