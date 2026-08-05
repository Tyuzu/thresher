package notifications

// UpdatePreferencesRequest defines incoming payloads with pointer fields to differentiate
// between an omitted key and an explicit false value in JSON.
type UpdatePreferencesRequest struct {
	MentionsEnabled *bool `json:"mentionsenabled"`
	FollowsEnabled  *bool `json:"followsenabled"`
	CommentsEnabled *bool `json:"commentsenabled"`
	LikesEnabled    *bool `json:"likesenabled"`
	MessagesEnabled *bool `json:"messagesenabled"`
	AllEnabled      *bool `json:"allenabled"`
}

// CreateRequest represents the incoming request payload for a single notification.
type CreateRequest struct {
	UserID      string `json:"userid"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	EntityType  string `json:"entitytype"`
	EntityID    string `json:"entityid"`
	RelatedUser string `json:"relateduser"`
}
