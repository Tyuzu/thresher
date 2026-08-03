package models

import "time"

type Block struct {
	Type     string `bson:"type" json:"type"`
	Content  string `bson:"content,omitempty" json:"content,omitempty"`
	URL      string `bson:"url,omitempty" json:"url,omitempty"`
	Alt      string `bson:"alt,omitempty" json:"alt,omitempty"`
	Caption  string `bson:"caption,omitempty" json:"caption,omitempty"`   // for video or image captions
	Language string `bson:"language,omitempty" json:"language,omitempty"` // for code blocks
}

type BlogPost struct {
	PostID      string    `bson:"postid" json:"postid"`
	Title       string    `bson:"title" json:"title"`
	Category    string    `bson:"category" json:"category"`
	Subcategory string    `bson:"subcategory" json:"subcategory"`
	ReferenceID *string   `bson:"referenceid,omitempty" json:"referenceid,omitempty"`
	Blocks      []Block   `bson:"blocks" json:"blocks"`
	Thumb       string    `bson:"thumb" json:"thumb"`
	CreatedBy   string    `bson:"createdby" json:"createdby"`
	CreatedAt   time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt   time.Time `bson:"updatedat" json:"updatedat"`
	Hashtags    []string  `bson:"hashtags" json:"hashtags"`
	Type        string    `json:"type" bson:"type"`
	Username    string    `json:"username" bson:"username"`
}
