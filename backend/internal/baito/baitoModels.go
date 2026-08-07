package baito

import (
	"time"
)

type Baito struct {
	BaitoId          string     `bson:"baitoid,omitempty" json:"baitoid"`
	EntityType       string     `bson:"entityType" json:"entityType"`
	EntityID         string     `bson:"entityId" json:"entityId"`
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
	WorkHours        string     `bson:"workHours" json:"workHours"`
	Benefits         string     `bson:"benefits,omitempty" json:"benefits,omitempty"`
	Email            string     `bson:"email,omitempty" json:"email,omitempty"`
	Tags             []string   `bson:"tags,omitempty" json:"tags,omitempty"`
	Duration         string     `bson:"duration,omitempty" json:"duration,omitempty"`
	LastDateToApply  *time.Time `bson:"lastdate,omitempty" json:"lastdate,omitempty"`
	CreatedAt        time.Time  `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time  `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
	OwnerID          string     `bson:"ownerId" json:"ownerId"`
	ApplicationCount int        `bson:"applicationcount" json:"applicationcount"`
}

type BaitoApplication struct {
	BaitoAppId  string    `bson:"baitoappid,omitempty" json:"baitoappid"`
	BaitoID     string    `bson:"baitoid" json:"baitoid"`
	UserID      string    `bson:"userid" json:"userid"`
	Username    string    `bson:"username" json:"username"`
	Pitch       string    `bson:"pitch" json:"pitch"`
	SubmittedAt time.Time `bson:"submittedAt" json:"submittedAt"`
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
	WorkHours       string     `bson:"workHours" json:"workHours"`
	Duration        string     `bson:"duration,omitempty" json:"duration,omitempty"`
	LastDateToApply *time.Time `bson:"lastdate,omitempty" json:"lastdate,omitempty"`
	CreatedAt       time.Time  `bson:"createdAt" json:"createdAt"`
	OwnerID         string     `bson:"ownerId" json:"ownerId"`
}
