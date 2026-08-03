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
	MediaURL    []string          `bson:"mediaurl,omitempty" json:"mediaurl,omitempty"`       // clean filenames
	Thumbnail   string            `bson:"thumbnail,omitempty" json:"thumbnail,omitempty"`     // video thumbnail
	Resolutions []int             `bson:"resolutions,omitempty" json:"resolutions,omitempty"` // optional resolutions
	Subtitles   map[string]string `bson:"subtitles,omitempty" json:"subtitles,omitempty"`     // lang → file path
	Tags        []string          `bson:"tags,omitempty" json:"tags,omitempty"`               // hashtags or topics

	Timestamp string    `bson:"timestamp" json:"timestamp"`
	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	Likes     int64     `bson:"likes" json:"likes"`
	Likers    []string  `bson:"likers,omitempty" json:"likers,omitempty"`

	// Legacy / optional field kept for backward compatibility
	Content string `bson:"content,omitempty" json:"content,omitempty"`
}

type Activity struct {
	// Username     string              `json:"username,omitempty" bson:"username,omitempty"`
	PlaceID      string    `json:"placeid,omitempty" bson:"placeid,omitempty"`
	Action       string    `json:"action,omitempty" bson:"action,omitempty"`
	PerformedBy  string    `json:"performedby,omitempty" bson:"performedby,omitempty"`
	Timestamp    time.Time `json:"timestamp,omitempty" bson:"timestamp,omitempty"`
	Details      string    `json:"details,omitempty" bson:"details,omitempty"`
	IPAddress    string    `json:"ipaddress,omitempty" bson:"ipaddress,omitempty"`
	DeviceInfo   string    `json:"deviceinfo,omitempty" bson:"deviceinfo,omitempty"`
	ActivityID   string    `json:"activityid" bson:"activityid,omitempty"`
	UserID       string    `json:"userid" bson:"userid"`
	ActivityType string    `json:"activitytype" bson:"activitytype"` // e.g., "follow", "review", "buy"
	EntityID     string    `json:"entityid,omitempty" bson:"entityid,omitempty"`
	EntityType   *string   `json:"entitytype,omitempty" bson:"entitytype,omitempty"` // "event", "place", or null
}
type Merch struct {
	MerchID string `json:"merchid" bson:"merchid"`
	// EventID     string             `json:"eventid" bson:"eventid"` // Reference to Event ID
	Name        string     `json:"name" bson:"name"`
	Slug        string     `json:"slug,omitempty" bson:"slug,omitempty"`         // URL-friendly name (e.g. "concert-tshirt")
	SKU         string     `json:"sku,omitempty" bson:"sku,omitempty"`           // Stock Keeping Unit, unique per product
	Category    string     `json:"category,omitempty" bson:"category,omitempty"` // e.g. “T-Shirts”, “Accessories”
	Price       float64    `json:"price" bson:"price"`
	Discount    float64    `json:"discount,omitempty" bson:"discount,omitempty"`       // e.g. 0.10 for 10% off
	Stock       int        `json:"stock" bson:"stock"`                                 // Number of items available
	StockStatus string     `json:"stockstatus,omitempty" bson:"stockstatus,omitempty"` // e.g. “In Stock”, “Out of Stock”, “Preorder”
	MerchPhoto  string     `json:"merchpic" bson:"merchpic"`
	Gallery     []string   `json:"gallery,omitempty" bson:"gallery,omitempty"` // Additional image filenames
	EntityID    string     `json:"entityid" bson:"entityid"`
	EntityType  string     `json:"entitytype" bson:"entitytype"` // “event” or “place”
	Description string     `json:"description,omitempty" bson:"description,omitempty"`
	ShortDesc   string     `json:"shortdesc,omitempty" bson:"shortdesc,omitempty"` // One-line summary
	Rating      float64    `json:"rating,omitempty" bson:"rating,omitempty"`       // Average rating (0.0–5.0)
	ReviewCount int        `json:"reviewcount,omitempty" bson:"reviewcount,omitempty"`
	Weight      float64    `json:"weight,omitempty" bson:"weight,omitempty"`         // In kilograms/pounds
	Dimensions  string     `json:"dimensions,omitempty" bson:"dimensions,omitempty"` // e.g. “30×20×2 cm”
	Tags        []string   `json:"tags,omitempty" bson:"tags,omitempty"`             // e.g. ["rock", "tshirt"]
	CreatedAt   time.Time  `json:"createdat" bson:"createdat"`
	UpdatedAt   time.Time  `json:"updatedat" bson:"updatedat"`
	DeletedAt   *time.Time `json:"deletedat,omitempty" bson:"deletedat,omitempty"` // Soft delete timestamp
	UserID      string     `bson:"userid" json:"userid"`
}

type Menu struct {
	MenuID      string    `json:"menuid" bson:"menuid"`
	PlaceID     string    `json:"placeid" bson:"placeid"` // Reference to Place ID
	Name        string    `json:"name" bson:"name"`
	Price       float64   `json:"price" bson:"price"`
	Discount    float64   `json:"discount,omitempty" bson:"discount,omitempty"`
	Stock       int       `json:"stock" bson:"stock"` // Number of items available
	MenuPhoto   string    `json:"menupic" bson:"menupic"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt   time.Time `json:"createdat" bson:"createdat"`
	UserID      string    `bson:"userid" json:"userid"`
	UpdatedAt   time.Time `bson:"updatedat" json:"updatedat"`
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

	EntityType string `json:"entitytype" bson:"entitytype"`
	EntityID   string `json:"entityid" bson:"entityid"`

	Rating  int    `json:"rating" bson:"rating"`
	Comment string `json:"comment" bson:"comment"`

	Likes    int `json:"likes,omitempty" bson:"likes,omitempty"`
	Dislikes int `json:"dislikes,omitempty" bson:"dislikes,omitempty"`

	CreatedAt time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt time.Time `json:"updatedat" bson:"updatedat"`
}

type Media struct {
	MediaID       string    `json:"mediaid" bson:"mediaid"`
	MediaGroupID  string    `json:"mediagroupid" bson:"mediagroupid"` // new field to group multiple files
	Type          string    `json:"type" bson:"type"`                 // "image", "video", "text"
	URL           string    `json:"url,omitempty" bson:"url,omitempty"`
	ThumbnailURL  string    `json:"thumbnailurl,omitempty" bson:"thumbnailurl,omitempty"`
	Caption       string    `json:"caption,omitempty" bson:"caption,omitempty"`
	Description   string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatorID     string    `json:"creatorid" bson:"creatorid"`
	LikesCount    int       `json:"likescount" bson:"likescount"`
	CommentsCount int       `json:"commentscount" bson:"commentscount"`
	Visibility    string    `json:"visibility,omitempty" bson:"visibility,omitempty"`
	Tags          []string  `json:"tags,omitempty" bson:"tags,omitempty"` // e.g., song:123, event:456
	Duration      float64   `json:"duration,omitempty" bson:"duration,omitempty"`
	FileSize      int64     `json:"filesize,omitempty" bson:"filesize,omitempty"`
	MimeType      string    `json:"mimetype,omitempty" bson:"mimetype,omitempty"`
	IsFeatured    bool      `json:"isfeatured,omitempty" bson:"isfeatured,omitempty"`
	EntityID      string    `json:"entityid" bson:"entityid"`
	EntityType    string    `json:"entitytype" bson:"entitytype"` // "event", "place", etc.
	CreatedAt     time.Time `json:"createdat" bson:"createdat"`
	UpdatedAt     time.Time `json:"updatedat" bson:"updatedat"`
	UserID        string    `json:"userid" bson:"userid"`
	Extn          string    `json:"extn" bson:"extn"`
	CaptionLang   string    `json:"captionlang" bson:"captionlang"`
}

const (
	MediaTypeImage    = "image"
	MediaTypeVideo    = "video"
	MediaTypePhoto360 = "photo360"
)

type Promotion struct {
	ID          primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Title       string             `json:"title" bson:"title"`
	Description string             `json:"description" bson:"description"`
	ExpiryDate  time.Time          `json:"expirydate" bson:"expirydate"`
}

// Owner Management Handlers
type Owner struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Name     string             `json:"name" bson:"name"`
	Email    string             `json:"email" bson:"email"`
	Password string             `json:"password" bson:"password"`
}
