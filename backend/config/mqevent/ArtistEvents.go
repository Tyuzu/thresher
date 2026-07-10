package mqevent

import (
	"time"
)

/* ============================================================
   ARTIST EVENTS
============================================================ */

const (
	ArtistCreated = "artist.created"
	ArtistUpdated = "artist.updated"
	SongCreated   = "song.created"
	SongUpdated   = "song.updated"
)

type ArtistCreatedPayload struct {
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistUpdatedPayload struct {
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SongCreatedPayload struct {
	SongID     string    `json:"song_id"`
	ArtistID   string    `json:"artist_id"`
	SongTitle  string    `json:"song_title"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SongUpdatedPayload struct {
	SongID     string    `json:"song_id"`
	ArtistID   string    `json:"artist_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
