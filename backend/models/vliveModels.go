package models

import (
	"time"
)

/*
Livestream state machine
*/
const (
	LiveCreated   = "CREATED"
	LiveReady     = "READY"
	LiveLive      = "LIVE"
	LiveEnded     = "ENDED"
	LiveCancelled = "CANCELLED"
	LiveError     = "ERROR"
)

/*
LiveStream represents a single livestream lifecycle.
*/
type LiveStream struct {
	LiveID string `bson:"liveid,omitempty" json:"liveid"`

	// Ownership / scope
	EntityType string `bson:"entitytype" json:"entitytype"`
	EntityID   string `bson:"entityid" json:"entityid"`
	CreatorID  string `bson:"creatorid" json:"creatorid"`

	// Metadata
	Title       string   `bson:"title" json:"title"`
	Description string   `bson:"description,omitempty" json:"description,omitempty"`
	Thumbnail   string   `bson:"thumbnail,omitempty" json:"thumbnail,omitempty"`
	Tags        []string `bson:"tags,omitempty" json:"tags,omitempty"`
	State       string   `bson:"state" json:"state"`

	// Visibility
	IsPublic bool `bson:"ispublic" json:"ispublic"`
	Unlisted bool `bson:"unlisted" json:"unlisted"`

	// Streaming / ingest (NEVER expose)
	StreamKey string `bson:"streamkey" json:"-"`
	IngestURL string `bson:"ingesturl" json:"-"`

	// Playback
	PlaybackURL string `bson:"playbackurl,omitempty" json:"playbackurl,omitempty"`

	// Recording / VOD (internal paths hidden)
	RecordingPath string `bson:"recordingpath,omitempty" json:"-"`
	VODURL        string `bson:"vodurl,omitempty" json:"vodurl,omitempty"`
	VODPublished  bool   `bson:"vodpublished" json:"vodpublished"`

	// Chat
	ChatEnabled     bool `bson:"chatenabled" json:"chatenabled"`
	SlowModeSeconds int  `bson:"slowmodeseconds" json:"slowmodeseconds"`

	// Scheduling / timing
	ScheduledAt time.Time `bson:"scheduledat,omitempty" json:"scheduledat,omitempty"`
	ReadyAt     time.Time `bson:"readyat,omitempty" json:"readyaAt,omitempty"`
	StartedAt   time.Time `bson:"startedat,omitempty" json:"startedat,omitempty"`
	EndedAt     time.Time `bson:"endedat,omitempty" json:"endedat,omitempty"`

	// Audit
	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt time.Time `bson:"updatedat,omitempty" json:"updatedat,omitempty"` // optional for tracking edits

	// Runtime-only fields (not persisted)
	ViewerCount int `bson:"-" json:"viewerCount,omitempty"`
}
