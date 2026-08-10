package feed

import "time"

// PostAction defines if this is create or edit
type PostAction string

const (
	ActionCreate PostAction = "create"
	ActionEdit   PostAction = "edit"
)

// PostPayload now matches new frontend structure
type PostPayload struct {
	PostID      string     `json:"postid,omitempty"`
	Type        string     `json:"type,omitempty"`
	Text        string     `json:"text,omitempty"`
	Title       string     `json:"title,omitempty"`
	Description string     `json:"description,omitempty"`
	Tags        []string   `json:"tags,omitempty"`
	Caption     string     `json:"caption,omitempty"`
	Images      []MediaRef `json:"images,omitempty"`
	Video       *MediaRef  `json:"video,omitempty"`
	Thumbnail   *MediaRef  `json:"thumbnail,omitempty"`
}

// MediaRef supports nested resolutions inside video
type MediaRef struct {
	Filename    string `json:"filename"`
	Extn        string `json:"extn"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}

type BulkMetadataRequest struct {
	IDs []string `json:"ids"`
}

type PostMetadata struct {
	PostID      string `json:"postId"`
	Likes       int64  `json:"likes"`
	Comments    int64  `json:"comments"`
	LikedByUser bool   `json:"likedByUser"`
}

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
