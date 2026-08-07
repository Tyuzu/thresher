package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Response struct {
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

type Setting struct {
	Type        string `json:"type"`
	Value       any    `json:"value"`
	Description string `json:"description"`
}

type Coordinates struct {
	Latitude  float64 `json:"latitude,omitempty" bson:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty" bson:"longitude,omitempty"`
}

//	type UserSettings struct {
//		UserID   string    `bson:"userID" json:"userID"`
//		Settings []Setting `bson:"settings" json:"settings"`
//	}

type FeedPost struct {
	Username    string `bson:"username" json:"username"`
	PostID      string `bson:"postid,omitempty" json:"postid"`
	UserID      string `bson:"userid" json:"userid"`
	Type        string `bson:"type" json:"type"`
	Text        string `bson:"text,omitempty" json:"text,omitempty"`
	Title       string `bson:"title,omitempty" json:"title,omitempty"`
	Description string `bson:"description,omitempty" json:"description,omitempty"`
	Caption     string `bson:"caption,omitempty" json:"caption,omitempty"`

	Media       []string          `bson:"media,omitempty" json:"media,omitempty"`             // full file paths (key/filename.extn)
	MediaURL    []string          `bson:"media_url,omitempty" json:"media_url,omitempty"`     // clean filenames
	Thumbnail   string            `bson:"thumbnail,omitempty" json:"thumbnail,omitempty"`     // video thumbnail
	Resolutions []int             `bson:"resolutions,omitempty" json:"resolutions,omitempty"` // optional resolutions
	Subtitles   map[string]string `bson:"subtitles,omitempty" json:"subtitles,omitempty"`     // lang → file path
	Tags        []string          `bson:"tags,omitempty" json:"tags,omitempty"`               // hashtags or topics

	Timestamp string    `bson:"timestamp" json:"timestamp"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	Likes     int64     `bson:"likes" json:"likes"`
	Likers    []string  `bson:"likers,omitempty" json:"likers,omitempty"`

	// Legacy / optional field kept for backward compatibility
	Content string `bson:"content,omitempty" json:"content,omitempty"`
}

type Activity struct {
	// Username     string              `json:"username,omitempty" bson:"username,omitempty"`
	PlaceID      string    `json:"placeId,omitempty" bson:"placeId,omitempty"`
	Action       string    `json:"action,omitempty" bson:"action,omitempty"`
	PerformedBy  string    `json:"performedBy,omitempty" bson:"performedBy,omitempty"`
	Timestamp    time.Time `json:"timestamp,omitempty" bson:"timestamp,omitempty"`
	Details      string    `json:"details,omitempty" bson:"details,omitempty"`
	IPAddress    string    `json:"ipAddress,omitempty" bson:"ipAddress,omitempty"`
	DeviceInfo   string    `json:"deviceInfo,omitempty" bson:"deviceInfo,omitempty"`
	ActivityID   string    `json:"activityid" bson:"activityid,omitempty"`
	UserID       string    `json:"user_id" bson:"user_id"`
	ActivityType string    `json:"activity_type" bson:"activity_type"` // e.g., "follow", "review", "buy"
	EntityID     string    `json:"entity_id,omitempty" bson:"entity_id,omitempty"`
	EntityType   *string   `json:"entity_type,omitempty" bson:"entity_type,omitempty"` // "event", "place", or null
}

// UserProfileResponse defines the structure for the user profile response
type UserSuggest struct {
	Username    string `json:"username" bson:"username"`
	UserID      string `json:"userid" bson:"userid"`
	IsFollowing bool
	Bio         string `json:"bio,omitempty" bson:"bio,omitempty"`
}

type Suggestion struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Type        string             `json:"type" bson:"type"` // e.g., "place" or "event"
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	Name        string             `json:"name"`
}

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

type Promotion struct {
	ID          primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	ExpiryDate  time.Time          `json:"expiry_date" bson:"expiry_date"`
}

// Owner Management Handlers
type Owner struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Name     string             `json:"name" bson:"name"`
	Email    string             `json:"email" bson:"email"`
	Password string             `json:"password" bson:"password"`
}

// Index represents the incoming JSON event structure.
type Index struct {
	EntityType string `json:"entity_type"`
	Method     string `json:"method"`
	EntityId   string `json:"entity_id"`
	ItemId     string `json:"item_id"`
	ItemType   string `json:"item_type"`
}
