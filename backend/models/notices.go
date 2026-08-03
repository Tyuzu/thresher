package models

import (
	"time"
)

// Correct Notice model (in case you define here)
type Notice struct {
	NoticeID   string    `bson:"noticeid,omitempty" json:"noticeid"`
	EntityType string    `bson:"entitytype" json:"entitytype"`
	EntityId   string    `bson:"entityid" json:"entityid"`
	Title      string    `bson:"title" json:"title"`
	Content    string    `bson:"content,omitempty" json:"content,omitempty"`
	Summary    string    `bson:"summary" json:"summary"`
	CreatedBy  string    `bson:"createdby" json:"createdby"`
	CreatedAt  time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt  time.Time `bson:"updatedat" json:"updatedat"`
}
