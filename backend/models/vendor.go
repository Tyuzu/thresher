package models

import "time"

// Vendor represents a vendor who can be hired for events
type Vendor struct {
	VendorID     string    `json:"vendorid" bson:"vendorid"`
	UserID       string    `json:"userid" bson:"userid"`
	Name         string    `json:"name" bson:"name"`
	Category     string    `json:"category" bson:"category"`
	Description  string    `json:"description,omitempty" bson:"description,omitempty"`
	Email        string    `json:"email,omitempty" bson:"email,omitempty"`
	Phone        string    `json:"phone,omitempty" bson:"phone,omitempty"`
	Location     string    `json:"location,omitempty" bson:"location,omitempty"`
	Rating       float64   `json:"rating,omitempty" bson:"rating,omitempty"`
	RatingCount  int       `json:"ratingcount,omitempty" bson:"ratingcount,omitempty"`
	ProfileImage string    `json:"profileimage,omitempty" bson:"profileimage,omitempty"`
	Portfolio    []string  `json:"portfolio,omitempty" bson:"portfolio,omitempty"`
	Verified     bool      `json:"verified" bson:"verified"`
	Available    bool      `json:"available" bson:"available"`
	CreatedAt    time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt    time.Time `json:"updatedat,omitempty" bson:"updatedat,omitempty"`
}

// VendorHiring represents the relationship between an event and hired vendors
type VendorHiring struct {
	HiringID       string    `json:"hiringid" bson:"hiringid"`
	EventID        string    `json:"eventid" bson:"eventid"`
	VendorID       string    `json:"vendorid" bson:"vendorid"`
	VendorName     string    `json:"vendorname" bson:"vendorname"`
	VendorCategory string    `json:"vendorcategory" bson:"vendorcategory"`
	HiredAt        time.Time `json:"hiredat" bson:"hiredat"`
	HiredBy        string    `json:"hiredby" bson:"hiredby"` // UserID of event creator/organizer
	Status         string    `json:"status" bson:"status"`   // "hired", "accepted", "rejected", "completed"
	Notes          string    `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt      time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt      time.Time `json:"updatedat,omitempty" bson:"updatedat,omitempty"`
}

// VendorResponse is the response structure for vendor data
type VendorResponse struct {
	VendorID     string    `json:"vendorid"`
	Name         string    `json:"name"`
	Category     string    `json:"category"`
	Description  string    `json:"description,omitempty"`
	Email        string    `json:"email,omitempty"`
	Phone        string    `json:"phone,omitempty"`
	Location     string    `json:"location,omitempty"`
	Rating       float64   `json:"rating,omitempty"`
	RatingCount  int       `json:"ratingcount,omitempty"`
	ProfileImage string    `json:"profileimage,omitempty"`
	Portfolio    []string  `json:"portfolio,omitempty"`
	Verified     bool      `json:"verified"`
	Status       string    `json:"status,omitempty" bson:"status,omitempty"`
	HiringID     string    `json:"hiringid,omitempty" bson:"hiringid,omitempty"`
	HiredAt      time.Time `json:"hiredat,omitempty" bson:"hiredat,omitempty"`
}

// AvailabilitySlot represents a vendor's unavailable or available date range
type AvailabilitySlot struct {
	SlotID         string    `json:"slotid" bson:"slotid"`
	VendorID       string    `json:"vendorid" bson:"vendorid"`
	StartDate      string    `json:"startdate" bson:"startdate"` // YYYY-MM-DD
	EndDate        string    `json:"enddate" bson:"enddate"`     // YYYY-MM-DD
	Recurring      bool      `json:"recurring,omitempty" bson:"recurring,omitempty"`
	RecurrenceRule string    `json:"recurrencerule,omitempty" bson:"recurrencerule,omitempty"` // e.g. RFC5545 or simple rule
	Notes          string    `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt      time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt      time.Time `json:"updatedat,omitempty" bson:"updatedat,omitempty"`
}
