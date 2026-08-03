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
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}

type ArtistUpdatedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type SongCreatedPayload struct {
	SongID     string    `json:"songid"`
	ArtistID   string    `json:"artistid"`
	SongTitle  string    `json:"songtitle"`
	OccurredAt time.Time `json:"occurredat"`
}

type SongUpdatedPayload struct {
	SongID     string    `json:"songid"`
	ArtistID   string    `json:"artistid"`
	OccurredAt time.Time `json:"occurredat"`
}

type SongDeletedPayload struct {
	SongID     string    `json:"songid"`
	ArtistID   string    `json:"artistid"`
	OccurredAt time.Time `json:"occurredat"`
}

type ArtistEventCreatePayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}

type ArtistEventUpdatePayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}

type ArtistAddedToEventPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}

type BandMemberAddedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}

type BandMemberUpdatedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}

type BandMemberDeletedPayload struct {
	ArtistID   string    `json:"artistid"`
	UserID     string    `json:"userid"`
	ArtistName string    `json:"artistname"`
	OccurredAt time.Time `json:"occurredat"`
}
