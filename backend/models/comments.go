package models

import "time"

type Comment struct {
	CommentID  string    `json:"commentid" bson:"commentid,omitempty"`
	EntityType string    `json:"entitytype" bson:"entitytype"`
	EntityID   string    `json:"entityid" bson:"entityid"`
	Content    string    `json:"content" bson:"content"`
	CreatedBy  string    `json:"createdby" bson:"createdby"`
	CreatedAt  time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt  time.Time `json:"updatedat" bson:"updatedat"`
	Likes      int       `json:"likes" bson:"likes"`
}
