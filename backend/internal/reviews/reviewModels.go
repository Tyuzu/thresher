package reviews

import "time"

type Review struct {
	ReviewID string `json:"reviewid" bson:"reviewid"`
	UserID   string `json:"userid" bson:"userid"`

	EntityType string `json:"entityType" bson:"entityType"`
	EntityID   string `json:"entityId" bson:"entityId"`

	Rating  int    `json:"rating" bson:"rating"`
	Comment string `json:"comment" bson:"comment"`

	Likes    int `json:"likes,omitempty" bson:"likes,omitempty"`
	Dislikes int `json:"dislikes,omitempty" bson:"dislikes,omitempty"`

	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
}
