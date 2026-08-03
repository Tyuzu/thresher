package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type FileMetadata struct {
	ID        primitive.ObjectID  `bson:"_id,omitempty"`
	Hash      string              `bson:"hash"`
	UserPosts map[string][]string `bson:"userposts"` // Maps userID to an array of postIDs
	PostURLs  map[string]string   `bson:"posturls"`  // Maps postID to its corresponding URL
}
