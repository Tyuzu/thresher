package mqevent

import "time"

/* ============================================================
   ARTIST EVENTS
============================================================ */

const (
	ArtistCreatedEvent      = "artist.created"
	ArtistUpdatedEvent      = "artist.updated"
	ArtistEventCreatedEvent = "artist.event.created"
	ArtistEventUpdatedEvent = "artist.event.updated"
	ArtistEventDeletedEvent = "artist.event.deleted"
	ArtistAddedToEvent      = "artist.event.added"

	SongCreatedEvent = "song.created"
	SongUpdatedEvent = "song.updated"
	SongDeletedEvent = "song.deleted"

	BandMemberAddedEvent   = "band.member.created"
	BandMemberUpdatedEvent = "band.member.updated"
	BandMemberDeletedEvent = "band.member.deleted"
)

/* ============================================================
   ARTIST
============================================================ */

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

/* ============================================================
   SONG
============================================================ */

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

type SongDeletedPayload struct {
	SongID     string    `json:"song_id"`
	ArtistID   string    `json:"artist_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   ARTIST EVENT
============================================================ */

type ArtistEventCreatedPayload struct {
	EventID    string    `json:"event_id"`
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistEventUpdatedPayload struct {
	EventID    string    `json:"event_id"`
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistEventDeletedPayload struct {
	EventID    string    `json:"event_id"`
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistAddedToEventPayload struct {
	EventID    string    `json:"event_id"`
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   BAND MEMBERS
============================================================ */

type BandMemberAddedPayload struct {
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BandMemberUpdatedPayload struct {
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BandMemberDeletedPayload struct {
	ArtistID   string    `json:"artist_id"`
	UserID     string    `json:"user_id"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}
