package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
	MessageID  string     `bson:"messageid,omitempty"        json:"messageid"`
	ChatID     string     `bson:"chatid"              json:"chatid"`
	RoomID     string     `bson:"roomid"              json:"roomid"`
	UserID     string     `bson:"userid"              json:"userid"`
	Text       string     `bson:"text,omitempty" json:"text,omitempty"`
	FileURL    string     `bson:"fileurl,omitempty" json:"fileurl,omitempty"`
	FileType   string     `bson:"filetype,omitempty" json:"filetype,omitempty"` // "image" or "video"
	CreatedAt  time.Time  `bson:"createdat" json:"createdat"`
	ReplyTo    *ReplyRef  `bson:"replyto,omitempty" json:"replyto,omitempty"`
	SenderName string     `bson:"sendername,omitempty" json:"sendername,omitempty"`
	AvatarURL  string     `bson:"avatarurl,omitempty"   json:"avatarurl,omitempty"`
	Content    string     `bson:"content"           json:"content"`
	Media      *Media     `bson:"media,omitempty"   json:"media,omitempty"`
	EditedAt   *time.Time `bson:"editedat,omitempty" json:"editedat,omitempty"`
	Deleted    bool       `bson:"deleted"           json:"deleted"`
	ReadBy     []string   `bson:"readby,omitempty"  json:"readby,omitempty"`
	Status     string     `bson:"status,omitempty"  json:"status,omitempty"` // e.g. "sent", "read"
	Nonce      string     `bson:"nonce" json:"nonce"`
	Seq        int64      `bson:"seq" json:"seq"`
}

type Chat struct {
	Users        []string        `bson:"users" json:"users"`
	LastMessage  *MessagePreview `bson:"lastmessage,omitempty" json:"lastmessage,omitempty"`
	ReadStatus   map[string]bool `bson:"readstatus,omitempty" json:"readstatus,omitempty"`
	ChatID       string          `bson:"chatid,omitempty" json:"chatid"`
	Participants []string        `bson:"participants,omitempty" json:"participants,omitempty"`
	CreatedAt    time.Time       `bson:"createdat" json:"createdat"`
	UpdatedAt    time.Time       `bson:"updatedat" json:"updatedat"`
	EntityType   string          `bson:"entitytype,omitempty" json:"entitytype,omitempty"`
	EntityId     string          `bson:"entityid,omitempty" json:"entityid,omitempty"`
	LastSeq      int64           `bson:"lastseq" json:"lastseq"`
}

type MessagePreview struct {
	Text      string    `bson:"text" json:"text"`
	UserID    string    `bson:"userid" json:"userid"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
}

// ReplyRef represents the clientâ€side â€œreplyToâ€ payload.
type ReplyRef struct {
	ID   string `json:"id"`
	User string `json:"user"`
	Text string `json:"text"`
}

type Like struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"`
	UserID     string             `bson:"userid"`
	EntityType string             `bson:"entitytype"` // e.g. "post"
	EntityID   string             `bson:"entityid"`   // e.g. post ID
	CreatedAt  time.Time          `bson:"createdat"`
}

// IncomingWSMessage represents a generic WebSocket inbound payload
type IncomingWSMessage struct {
	Type      string `json:"type"`
	ChatID    string `json:"chatid"`
	Content   string `json:"content"`
	MediaURL  string `json:"mediaurl"`
	MediaType string `json:"mediatype"`
	Online    bool   `json:"online"`
	ClientID  string `json:"clientid,omitempty"`
}

// Media represents media attached to a message
type MessageMedia struct {
	URL  string `bson:"url"  json:"url"`
	Type string `bson:"type" json:"type"`
}
