package ads

import "time"

type AdType string

const (
	TypeExternal AdType = "external"
	TypePost     AdType = "internal_post"
)

type Ad struct {
	ID          string    `json:"id,omitempty" bson:"_id,omitempty"`
	Type        AdType    `json:"type" bson:"type"`                         // "external" or "internal_post"
	PostID      string    `json:"postId,omitempty" bson:"postId,omitempty"` // Reference to internal post if Type == "internal_post"
	Title       string    `json:"title,omitempty" bson:"title,omitempty"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	Image       string    `json:"image,omitempty" bson:"image,omitempty"`
	Link        string    `json:"link,omitempty" bson:"link,omitempty"`
	Category    string    `json:"category,omitempty" bson:"category,omitempty"`
	Page        string    `json:"page,omitempty" bson:"page,omitempty"`
	Position    string    `json:"position,omitempty" bson:"position,omitempty"`
	Status      string    `json:"status" bson:"status"` // "active", "inactive"
	CreatedAt   time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" bson:"updatedAt"`
}
