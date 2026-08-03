package models

import (
	"time"
)

type Baito struct {
	BaitoId          string     `bson:"baitoid,omitempty" json:"baitoid"`
	EntityType       string     `bson:"entitytype" json:"entitytype"`
	EntityID         string     `bson:"entityid" json:"entityid"`
	Title            string     `bson:"title" json:"title"`
	Description      string     `bson:"description" json:"description"`
	Category         string     `bson:"category" json:"category"`
	SubCategory      string     `bson:"subcategory" json:"subcategory"`
	Location         string     `bson:"location" json:"location"`
	Wage             string     `bson:"wage" json:"wage"`
	Phone            string     `bson:"phone" json:"phone"`
	Requirements     string     `bson:"requirements" json:"requirements"`
	Banner           string     `bson:"banner,omitempty" json:"banner,omitempty"`
	Images           []string   `bson:"images" json:"images"`
	WorkHours        string     `bson:"workhours" json:"workhours"`
	Benefits         string     `bson:"benefits,omitempty" json:"benefits,omitempty"`
	Email            string     `bson:"email,omitempty" json:"email,omitempty"`
	Tags             []string   `bson:"tags,omitempty" json:"tags,omitempty"`
	Duration         string     `bson:"duration,omitempty" json:"duration,omitempty"`
	LastDateToApply  *time.Time `bson:"lastdate,omitempty" json:"lastdate,omitempty"`
	CreatedAt        time.Time  `bson:"createdat" json:"createdat"`
	UpdatedAt        time.Time  `bson:"updatedat,omitempty" json:"updatedat,omitempty"`
	OwnerID          string     `bson:"ownerid" json:"ownerid"`
	ApplicationCount int        `bson:"applicationcount" json:"applicationcount"`
}

type BaitoApplication struct {
	BaitoAppId  string    `bson:"baitoappid,omitempty" json:"baitoappid"`
	BaitoID     string    `bson:"baitoid" json:"baitoid"`
	UserID      string    `bson:"userid" json:"userid"`
	Username    string    `bson:"username" json:"username"`
	Pitch       string    `bson:"pitch" json:"pitch"`
	SubmittedAt time.Time `bson:"submittedat" json:"submittedat"`
}

type BaitoWorker struct {
	UserID        string   `json:"userid" bson:"userid"`
	BaitoWorkerId string   `json:"baitoworkerid" bson:"baitoworkerid"`
	Name          string   `json:"name" bson:"name"`
	Age           int      `json:"age" bson:"age"`
	Phone         string   `json:"phone" bson:"phone"`
	Location      string   `json:"location" bson:"location"`
	Preferred     []string `json:"preferredroles" bson:"preferredroles"`
	Bio           string   `json:"bio" bson:"bio"`
	Avatar        string   `json:"avatar" bson:"avatar"`
	Email         string   `json:"email,omitempty" bson:"email,omitempty"`
	Experience    string   `json:"experience,omitempty" bson:"experience,omitempty"`
	Skills        string   `json:"skills,omitempty" bson:"skills,omitempty"`
	Availability  string   `json:"availability,omitempty" bson:"availability,omitempty"`
	ExpectedWage  string   `json:"expectedwage,omitempty" bson:"expectedwage,omitempty"`
	Languages     string   `json:"languages,omitempty" bson:"languages,omitempty"`
	Documents     []string `json:"documents,omitempty" bson:"documents,omitempty"`
	CreatedAt     int64    `json:"createdat" bson:"createdat"`
	UpdatedAt     int64    `json:"updatedat,omitempty" bson:"updatedat,omitempty"`
}

type BaitoRequest struct {
	Title        string
	Description  string
	Category     string
	SubCategory  string
	Location     string
	Wage         string
	Phone        string
	Requirements string
	WorkHours    string
	Benefits     string
	Email        string
	Tags         []string
}
