package mechat

import (
	"naevis/models"
	"time"
)

type Message struct {
	MessageID  string        `bson:"messageid,omitempty"  json:"messageid"`
	ChatID     string        `bson:"chatid"               json:"chatid"`
	RoomID     string        `bson:"roomid,omitempty"     json:"roomid,omitempty"`
	UserID     string        `bson:"userid"               json:"userid"`
	Text       string        `bson:"text,omitempty"       json:"text,omitempty"`
	FileURL    string        `bson:"fileURL,omitempty"    json:"fileURL,omitempty"`
	FileType   string        `bson:"fileType,omitempty"   json:"fileType,omitempty"` // "image" or "video"
	CreatedAt  time.Time     `bson:"createdAt"            json:"createdAt"`
	ReplyTo    *ReplyRef     `bson:"replyTo,omitempty"    json:"replyTo,omitempty"`
	SenderName string        `bson:"senderName,omitempty" json:"senderName,omitempty"`
	AvatarURL  string        `bson:"avatarUrl,omitempty"  json:"avatarUrl,omitempty"`
	Content    string        `bson:"content"              json:"content"`
	Media      *models.Media `bson:"media,omitempty"      json:"media,omitempty"`
	EditedAt   *time.Time    `bson:"editedAt,omitempty"   json:"editedAt,omitempty"`
	Deleted    bool          `bson:"deleted"              json:"deleted"`
	ReadBy     []string      `bson:"readBy,omitempty"     json:"readBy,omitempty"`
	Status     string        `bson:"status,omitempty"     json:"status,omitempty"` // e.g. "sent", "read"
	Nonce      string        `bson:"nonce,omitempty"      json:"nonce,omitempty"`
	Seq        int64         `bson:"seq,omitempty"        json:"seq,omitempty"`
}

type Chat struct {
	Users        []string        `bson:"users,omitempty"        json:"users,omitempty"`
	LastMessage  *MessagePreview `bson:"lastMessage,omitempty"  json:"lastMessage,omitempty"`
	ReadStatus   map[string]bool `bson:"readStatus,omitempty"   json:"readStatus,omitempty"`
	ChatID       string          `bson:"chatid,omitempty"       json:"chatid"`
	Participants []string        `bson:"participants,omitempty" json:"participants,omitempty"`
	CreatedAt    time.Time       `bson:"createdAt"              json:"createdAt"`
	UpdatedAt    time.Time       `bson:"updatedAt"              json:"updatedAt"`
	EntityType   string          `bson:"entitytype,omitempty"   json:"entitytype,omitempty"`
	EntityId     string          `bson:"entityid,omitempty"     json:"entityid,omitempty"`
	LastSeq      int64           `bson:"lastSeq,omitempty"      json:"lastSeq,omitempty"`
}

type MessagePreview struct {
	Text      string    `bson:"text"      json:"text"`
	UserID    string    `bson:"userid"    json:"userid"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
}

// ReplyRef represents the client-side "replyTo" payload.
type ReplyRef struct {
	ID   string `json:"id"`
	User string `json:"user"`
	Text string `json:"text"`
}

// IncomingWSMessage represents a generic WebSocket inbound payload
type IncomingWSMessage struct {
	Type      string `json:"type"`
	ChatID    string `json:"chatid,omitempty"`
	MessageID string `json:"messageid,omitempty"`
	Content   string `json:"content,omitempty"`
	MediaURL  string `json:"mediaUrl,omitempty"`
	MediaType string `json:"mediaType,omitempty"`
	Online    bool   `json:"online,omitempty"`
	ClientID  string `json:"clientId,omitempty"`
}
