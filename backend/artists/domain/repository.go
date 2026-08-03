package domain

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/models"
)

// ArtistRepository defines persistence operations required by the artists usecases.
type ArtistRepository interface {
	InsertArtist(ctx context.Context, artist *models.Artist) error
	FindArtistByID(ctx context.Context, artistID string, artist *models.Artist) error
	UpdateArtistByID(ctx context.Context, artistID string, update bson.M) error
	FindAllArtists(ctx context.Context, result *[]models.Artist) error
	FindArtistsByEventID(ctx context.Context, eventID string, result *[]models.Artist) error

	// Members
	AddArtistMember(ctx context.Context, artistID string, member models.BandMember) error
	UpdateArtistMember(ctx context.Context, artistID, memberID string, update bson.M) error
	DeleteArtistMember(ctx context.Context, artistID, memberID string) error

	// Songs
	FindSongsByArtist(ctx context.Context, artistID string, result *[]models.ArtistSong) error
	InsertArtistSong(ctx context.Context, song *models.ArtistSong) error
	UpdateArtistSong(ctx context.Context, artistID, songID string, update bson.M) error
	DeleteArtistSong(ctx context.Context, artistID, songID string) error

	// Events
	InsertArtistEvent(ctx context.Context, artistevent *models.ArtistEvent) error
	UpdateArtistEventByID(ctx context.Context, artisteventID string, update bson.M) error
	FindArtistEvents(ctx context.Context, artistID string, result *[]models.ArtistEvent) error
	FindArtistEventsByEventAndArtist(ctx context.Context, eventID, artistID string, result *[]models.ArtistEvent) error
	AddArtistToEvent(ctx context.Context, artistEvent models.ArtistEvent) error
}
