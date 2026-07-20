package feed

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
