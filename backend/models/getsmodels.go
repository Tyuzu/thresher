package models

import (
	"time"
)

type PlacesResponse struct {
	PlaceID        string   `json:"placeid"`
	Name           string   `json:"name"`
	ShortDesc      string   `json:"short_desc"`
	Address        string   `json:"address,omitempty"`
	Distance       float64  `json:"distance,omitempty"`
	OperatingHours []string `json:"operatinghours,omitempty"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	Banner         string   `json:"banner"`
}

/* ---------- MODELS ---------- */

type BaitosResponse struct {
	BaitoId         string     `bson:"baitoid,omitempty" json:"baitoid"`
	Title           string     `bson:"title" json:"title"`
	Description     string     `bson:"description" json:"description"`
	Category        string     `bson:"category" json:"category"`
	SubCategory     string     `bson:"subcategory" json:"subcategory"`
	Location        string     `bson:"location" json:"location"`
	Wage            string     `bson:"wage" json:"wage"`
	Requirements    string     `bson:"requirements" json:"requirements"`
	BannerURL       string     `bson:"banner,omitempty" json:"banner,omitempty"`
	WorkHours       string     `bson:"workhours" json:"workhours"`
	Duration        string     `bson:"duration,omitempty" json:"duration,omitempty"`
	LastDateToApply *time.Time `bson:"lastdate,omitempty" json:"lastdate,omitempty"`
	CreatedAt       time.Time  `bson:"createdat" json:"createdat"`
	OwnerID         string     `bson:"ownerid" json:"ownerid"`
}

type BaitoWorkersResponse struct {
	UserID        string   `json:"userid" bson:"userid"`
	BaitoWorkerId string   `json:"baitoworkerid" bson:"baitoworkerid"`
	Name          string   `json:"name" bson:"name"`
	Age           int      `json:"age" bson:"age"`
	Phone         string   `json:"phone" bson:"phone"`
	Location      string   `json:"location" bson:"location"`
	Preferred     []string `json:"preferredroles" bson:"preferredroles"`
	Bio           string   `json:"bio" bson:"bio"`
	ProfilePic    string   `json:"profilepic" bson:"profilepic"`
	CreatedAt     int64    `json:"createdat" bson:"createdat"`
}

// --- BlogPostResponse for list view ---

type BlogPostResponse struct {
	PostID      string    `bson:"postid" json:"postid"`
	Title       string    `bson:"title" json:"title"`
	Category    string    `bson:"category" json:"category"`
	Subcategory string    `bson:"subcategory" json:"subcategory"`
	ReferenceID *string   `bson:"referenceid,omitempty" json:"referenceid,omitempty"`
	Thumb       string    `bson:"thumb" json:"thumb"`
	CreatedBy   string    `bson:"createdby" json:"createdby"`
	Username    string    `bson:"username" json:"username"`
	CreatedAt   time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt   time.Time `bson:"updatedat" json:"updatedat"`
}
