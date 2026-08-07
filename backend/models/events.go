package models

import (
	"time"
)

// EventContactInfo represents event contact information (renamed to avoid conflicts with Farm.ContactInfo)
type EventContactInfo struct {
	Email         string `json:"email" bson:"email"`
	Phone         string `json:"phone" bson:"phone"`
	OrganizerName string `json:"organizer_name" bson:"organizer_name"`
}

// NewsItem represents a single news update for an event
type NewsItem struct {
	ID        string    `json:"id" bson:"_id"`
	Title     string    `json:"title" bson:"title"`
	Content   string    `json:"content" bson:"content"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
}

// PollOption represents a single poll option with vote count
type PollOption struct {
	Text  string `json:"text" bson:"text"`
	Votes int    `json:"votes" bson:"votes"`
}

// Poll represents a poll for an event
type Poll struct {
	ID       string       `json:"id" bson:"_id"`
	Question string       `json:"question" bson:"question"`
	Options  []PollOption `json:"options" bson:"options"`
}

// LostFoundItem represents a lost or found item at an event
type LostFoundItem struct {
	ID          string `json:"id" bson:"_id"`
	Type        string `json:"type" bson:"type"` // "lost" or "found"
	Description string `json:"description" bson:"description"`
	Contact     string `json:"contact" bson:"contact"`
}

type SocialMediaLinks struct {
	Title string `json:"title"`
	Url   string `json:"Url"`
}
