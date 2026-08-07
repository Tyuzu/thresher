package media

import "time"

type Media struct {
	MediaID       string    `json:"mediaid" bson:"mediaid"`
	MediaGroupID  string    `json:"mediaGroupId" bson:"mediaGroupId"` // new field to group multiple files
	Type          string    `json:"type" bson:"type"`                 // "image", "video", "text"
	URL           string    `json:"url,omitempty" bson:"url,omitempty"`
	ThumbnailURL  string    `json:"thumbnailUrl,omitempty" bson:"thumbnailUrl,omitempty"`
	Caption       string    `json:"caption,omitempty" bson:"caption,omitempty"`
	Description   string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatorID     string    `json:"creatorid" bson:"creatorid"`
	LikesCount    int       `json:"likesCount" bson:"likesCount"`
	CommentsCount int       `json:"commentsCount" bson:"commentsCount"`
	Visibility    string    `json:"visibility,omitempty" bson:"visibility,omitempty"`
	Tags          []string  `json:"tags,omitempty" bson:"tags,omitempty"` // e.g., song:123, event:456
	Duration      float64   `json:"duration,omitempty" bson:"duration,omitempty"`
	FileSize      int64     `json:"fileSize,omitempty" bson:"fileSize,omitempty"`
	MimeType      string    `json:"mimeType,omitempty" bson:"mimeType,omitempty"`
	IsFeatured    bool      `json:"isFeatured,omitempty" bson:"isFeatured,omitempty"`
	EntityID      string    `json:"entityid" bson:"entityid"`
	EntityType    string    `json:"entitytype" bson:"entitytype"` // "event", "place", etc.
	CreatedAt     time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt" bson:"updatedAt"`
	UserID        string    `json:"userid" bson:"userid"`
	Extn          string    `json:"extn" bson:"extn"`
	CaptionLang   string    `json:"captionlang" bson:"captionlang"`
}

const (
	MediaTypeImage    = "image"
	MediaTypeVideo    = "video"
	MediaTypePhoto360 = "photo360"
)
