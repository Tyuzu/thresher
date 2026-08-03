package models

import "time"

// EventContactInfo represents event contact information (renamed to avoid conflicts with Farm.ContactInfo)
type EventContactInfo struct {
	Email         string `json:"email" bson:"email"`
	Phone         string `json:"phone" bson:"phone"`
	OrganizerName string `json:"organizername" bson:"organizername"`
}

// NewsItem represents a single news update for an event
type NewsItem struct {
	ID        string    `json:"id" bson:"_id"`
	Title     string    `json:"title" bson:"title"`
	Content   string    `json:"content" bson:"content"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
}

// PollOption represents a single poll option with vote count
type PollOption struct {
	Text  string `json:"text" bson:"text"`
	Votes int    `json:"votes" bson:"votes"`
}

// Poll represents a poll for an event
type Poll struct {
	ID       string       `json:"id" bson:"_id"`
	Question string       `json:"question" bson:"question"`
	Options  []PollOption `json:"options" bson:"options"`
}

// LostFoundItem represents a lost or found item at an event
type LostFoundItem struct {
	ID          string `json:"id" bson:"_id"`
	Type        string `json:"type" bson:"type"` // "lost" or "found"
	Description string `json:"description" bson:"description"`
	Contact     string `json:"contact" bson:"contact"`
}
type Event struct {
	EventID          string      `json:"eventid" bson:"eventid"`
	Title            string      `json:"title" bson:"title"`
	Description      string      `json:"description" bson:"description"`
	Date             time.Time   `json:"date" bson:"date"`
	PlaceID          string      `json:"placeid" bson:"placeid"`
	PlaceName        string      `json:"placename" bson:"placename"`
	Location         string      `json:"location" bson:"location"`
	Coords           Coordinates `json:"coords" bson:"coords"`
	CreatorID        string      `json:"creatorid" bson:"creatorid"`
	Tickets          []Ticket    `json:"tickets" bson:"tickets"`
	Merch            []Merch     `json:"merch" bson:"merch"`
	StartDateTime    time.Time   `json:"startdatetime" bson:"startdatetime"`
	EndDateTime      time.Time   `json:"enddatetime" bson:"enddatetime"`
	Category         string      `json:"category" bson:"category"`
	Banner           string      `json:"banner" bson:"banner"`
	SeatingPlanImage string      `json:"seating" bson:"seating"`
	WebsiteURL       string      `json:"website_url" bson:"website_url"`
	Status           string      `json:"status" bson:"status"`
	Tags             []string    `json:"tags" bson:"tags"`
	CreatedAt        time.Time   `json:"createdat" bson:"createdat"`
	UpdatedAt        time.Time   `json:"updatedat" bson:"updatedat"`
	FAQs             []FAQ       `json:"faqs" bson:"faqs"`
	OrganizerName    string      `json:"organizername" bson:"organizername"`
	OrganizerContact string      `json:"organizercontact" bson:"organizercontact"`
	Artists          []string    `json:"artists,omitempty" bson:"artists,omitempty"`
	Published        string      `json:"published,omitempty" bson:"published,omitempty"`
	External         bool        `json:"external" bson:"external"`
	ExternalLink     string      `json:"externallink" bson:"externallink"`
	// New fields for alignment (CRITICAL FIX)
	ContactInfo  *EventContactInfo `json:"contactinfo" bson:"contactinfo"`
	News         []NewsItem        `json:"news" bson:"news"`
	Polls        []Poll            `json:"polls" bson:"polls"`
	LostFound    []LostFoundItem   `json:"lostfound" bson:"lostfound"`
	HiredVendors []VendorHiring    `json:"hiredvendors,omitempty" bson:"hiredvendors,omitempty"`
	// Computed fields for frontend filters
	Prices   []float64 `json:"prices,omitempty" bson:"-"`
	Currency string    `json:"currency,omitempty" bson:"-"`
}

// FAQ represents a single FAQ structure
type FAQ struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type SocialMediaLinks struct {
	Title string `json:"title"`
	Url   string `json:"url"`
}

type PurchasedTicket struct {
	EventID      string    `bson:"eventid" json:"eventid"`
	TicketID     string    `bson:"ticketid" json:"ticketid"`
	UserID       string    `bson:"userid" json:"userid"`
	BuyerName    string    `bson:"buyername" json:"buyername"`
	UniqueCode   string    `bson:"uniquecode" json:"uniquecode"`
	PurchaseDate time.Time `bson:"purchasedate" json:"purchasedate"`
	Price        int       `bson:"price" json:"price"`

	// Soft delete fields
	Canceled       bool       `bson:"canceled" json:"canceled"`
	CanceledAt     *time.Time `bson:"canceledat,omitempty" json:"canceledat,omitempty"`
	CanceledReason string     `bson:"cancelledreason,omitempty" json:"canceledreason,omitempty"`
	Transferred    bool       `bson:"transferred" json:"transferred"`
	TransferredTo  string     `bson:"transferredto,omitempty" json:"transferredto,omitempty"`
}
