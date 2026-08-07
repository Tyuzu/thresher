package faqs

import "time"

type FAQ struct {
	FAQID      string    `json:"faqid" bson:"faqid,omitempty"`
	EntityType string    `json:"entityType" bson:"entity_type"`
	EntityID   string    `json:"entityId" bson:"entity_id"`
	Content    string    `json:"content" bson:"content"`
	CreatedBy  string    `json:"createdBy" bson:"created_by"`
	CreatedAt  time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt  time.Time `json:"updatedAt" bson:"updated_at"`
	Likes      int       `json:"likes" bson:"likes"`
}
