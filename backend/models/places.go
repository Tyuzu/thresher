package models

import "time"

type Place struct {
	PlaceID           string            `json:"placeid" bson:"placeid"`
	Name              string            `json:"name" bson:"name"`
	ShortDesc         string            `json:"shortdesc" bson:"shortdesc"`
	Description       string            `json:"description" bson:"description"`
	Place             string            `json:"place" bson:"place"`
	Capacity          int               `json:"capacity" bson:"capacity"`
	Date              time.Time         `json:"date" bson:"date"`
	Address           string            `json:"address" bson:"address"`
	CreatedBy         string            `json:"createdby,omitempty" bson:"createdby,omitempty"`
	OrganizerName     string            `json:"organizername" bson:"organizername"`
	OrganizerContact  string            `json:"organizercontact" bson:"organizercontact"`
	Category          string            `json:"category" bson:"category"`
	Banner            string            `json:"banner" bson:"banner"`
	WebsiteURL        string            `json:"websiteurl" bson:"websiteurl"`
	Status            string            `json:"status" bson:"status"`
	AccessibilityInfo string            `json:"accessibilityinfo" bson:"accessibilityinfo"`
	SocialMediaLinks  []string          `json:"socialmedialinks" bson:"socialmedialinks"`
	Tags              []string          `json:"tags" bson:"tags"`
	CustomFields      map[string]any    `json:"customfields" bson:"customfields"`
	CreatedAt         time.Time         `json:"createdat" bson:"createdat"`
	UpdatedAt         time.Time         `json:"updatedat" bson:"updatedat"`
	City              string            `json:"city,omitempty" bson:"city,omitempty"`
	Country           string            `json:"country,omitempty" bson:"country,omitempty"`
	ZipCode           string            `json:"zipcode,omitempty" bson:"zipcode,omitempty"`
	Jobs              string            `json:"jobs,omitempty" bson:"jobs,omitempty"`
	Location          Coordinates       `json:"location" bson:"location,omitempty"`
	Phone             string            `json:"phone,omitempty" bson:"phone,omitempty"`
	Website           string            `json:"website,omitempty" bson:"website,omitempty"`
	IsOpen            bool              `json:"isopen,omitempty" bson:"isopen,omitempty"`
	Distance          float64           `json:"distance,omitempty" bson:"distance,omitempty"`
	Views             int               `json:"views,omitempty" bson:"views,omitempty"`
	ReviewCount       int               `json:"reviewcount,omitempty" bson:"reviewcount,omitempty"`
	SocialLinks       map[string]string `json:"sociallinks,omitempty" bson:"sociallLinks,omitempty"`
	UpdatedBy         string            `json:"updatedby,omitempty" bson:"updatedby,omitempty"`
	DeletedAt         *time.Time        `json:"deletedat,omitempty" bson:"deletedat,omitempty"`
	Amenities         []string          `json:"amenities,omitempty" bson:"amenities,omitempty"`
	Events            []string          `json:"events,omitempty" bson:"events,omitempty"`
	OperatingHours    []string          `json:"operatinghours,omitempty" bson:"operatinghours,omitempty"`
	Keywords          []string          `json:"keywords,omitempty" bson:"keywords,omitempty"`
}

type PlaceStatus string

const (
	PlaceActive   PlaceStatus = "active"
	PlaceInactive PlaceStatus = "inactive"
	PlaceClosed   PlaceStatus = "closed"
)

type Coordinates struct {
	Latitude  float64 `json:"latitude,omitempty" bson:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty" bson:"longitude,omitempty"`
}

type CheckIn struct {
	UserID    string    `json:"userid,omitempty" bson:"userid,omitempty"`
	PlaceID   string    `json:"placeid,omitempty" bson:"placeid,omitempty"`
	Timestamp time.Time `json:"timestamp,omitempty" bson:"timestamp,omitempty"`
	Comment   string    `json:"comment,omitempty" bson:"comment,omitempty"`
	Rating    float64   `json:"rating,omitempty" bson:"rating,omitempty"` // Optional
	Medias    []Media   `json:"images,omitempty" bson:"images,omitempty"` // Optional
}

type PlaceVersion struct {
	PlaceID   string            `json:"placeIid,omitempty" bson:"placeid,omitempty"`
	Version   int               `json:"version,omitempty" bson:"version,omitempty"`
	Data      Place             `json:"data,omitempty" bson:"data,omitempty"`
	UpdatedAt time.Time         `json:"updatedat,omitempty" bson:"updatedat,omitempty"`
	UpdatedBy string            `json:"updatedby,omitempty" bson:"updatedby,omitempty"`
	Changes   map[string]string `json:"changes,omitempty" bson:"changes,omitempty"`
}

type OperatingHours struct {
	Day          []string `json:"day,omitempty" bson:"day,omitempty"`
	OpeningHours []string `json:"opening,omitempty" bson:"opening,omitempty"`
	ClosingHours []string `json:"closing,omitempty" bson:"closing,omitempty"`
	TimeZone     string   `json:"timezone,omitempty" bson:"timezone,omitempty"`
}

type Tag struct {
	ID     string   `json:"id,omitempty" bson:"_id,omitempty"`
	Name   string   `json:"name,omitempty" bson:"name,omitempty"`
	Places []string `json:"places,omitempty" bson:"places,omitempty"` // List of Place IDs tagged with this keyword
}

const (
	PlaceStatusActive     = "active"
	PlaceStatusClosed     = "closed"
	PlaceStatusRenovation = "under renovation"
)
