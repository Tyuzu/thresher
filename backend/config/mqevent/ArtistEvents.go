package mqevent

import (
	"time"
)

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

type ArtistCreatedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistUpdatedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SongCreatedPayload struct {
	SongID     string    `json:"songid"`
	ArtistID   string    `json:"artistid"`
	SongTitle  string    `json:"song_title"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SongUpdatedPayload struct {
	SongID     string    `json:"songid"`
	ArtistID   string    `json:"artistid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type SongDeletedPayload struct {
	SongID     string    `json:"songid"`
	ArtistID   string    `json:"artistid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistEventCreatePayload struct {
	EventID    string    `json:"eventid"`
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistEventUpdatePayload struct {
	EventID    string    `json:"eventid"`
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistEventDeletePayload struct {
	EventID    string    `json:"eventid"`
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ArtistAddedToEventPayload struct {
	EventID    string    `json:"eventid"`
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BandMemberAddedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BandMemberUpdatedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type BandMemberDeletedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artist_name"`
	OccurredAt time.Time `json:"occurred_at"`
}
