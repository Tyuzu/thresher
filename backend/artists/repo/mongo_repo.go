package repo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/artists/domain"
	"naevis/config"
	db "naevis/infra/db"
	"naevis/models"
)

type MongoArtistRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.ArtistRepository {
	return &MongoArtistRepo{db: d}
}

func (m *MongoArtistRepo) InsertArtist(ctx context.Context, artist *models.Artist) error {
	return m.db.Insert(ctx, config.Collections.ArtistsCollection, artist)
}

func (m *MongoArtistRepo) FindArtistByID(ctx context.Context, artistID string, artist *models.Artist) error {
	return m.db.FindOne(ctx, config.Collections.ArtistsCollection, bson.M{"artistid": artistID}, artist)
}

func (m *MongoArtistRepo) UpdateArtistByID(ctx context.Context, artistID string, update bson.M) error {
	return m.db.Update(ctx, config.Collections.ArtistsCollection, bson.M{"artistid": artistID}, bson.M{"$set": update})
}

func (m *MongoArtistRepo) FindAllArtists(ctx context.Context, result *[]models.Artist) error {
	return m.db.FindMany(ctx, config.Collections.ArtistsCollection, bson.M{}, result)
}

func (m *MongoArtistRepo) FindArtistsByEventID(ctx context.Context, eventID string, result *[]models.Artist) error {
	return m.db.FindMany(ctx, config.Collections.ArtistsCollection, bson.M{"events": eventID}, result)
}

func (m *MongoArtistRepo) AddArtistMember(ctx context.Context, artistID string, member models.BandMember) error {
	return m.db.Update(ctx, config.Collections.ArtistsCollection, bson.M{"artistid": artistID}, bson.M{"$push": bson.M{"members": member}})
}

func (m *MongoArtistRepo) UpdateArtistMember(ctx context.Context, artistID, memberID string, update bson.M) error {
	return m.db.Update(ctx, config.Collections.ArtistsCollection, bson.M{"artistid": artistID, "members.memberid": memberID}, bson.M{"$set": update})
}

func (m *MongoArtistRepo) DeleteArtistMember(ctx context.Context, artistID, memberID string) error {
	return m.db.Update(ctx, config.Collections.ArtistsCollection, bson.M{"artistid": artistID}, bson.M{"$pull": bson.M{"members": bson.M{"memberid": memberID}}})
}

func (m *MongoArtistRepo) FindSongsByArtist(ctx context.Context, artistID string, result *[]models.ArtistSong) error {
	return m.db.FindMany(ctx, config.Collections.SongsCollection, bson.M{"artistid": artistID, "published": true}, result)
}

func (m *MongoArtistRepo) InsertArtistSong(ctx context.Context, song *models.ArtistSong) error {
	return m.db.Insert(ctx, config.Collections.SongsCollection, song)
}

func (m *MongoArtistRepo) UpdateArtistSong(ctx context.Context, artistID, songID string, update bson.M) error {
	return m.db.Update(ctx, config.Collections.SongsCollection, bson.M{"artistid": artistID, "songid": songID}, bson.M{"$set": update})
}

func (m *MongoArtistRepo) DeleteArtistSong(ctx context.Context, artistID, songID string) error {
	_, err := m.db.Delete(ctx, config.Collections.SongsCollection, bson.M{"artistid": artistID, "songid": songID})
	return err
}

func (m *MongoArtistRepo) InsertArtistEvent(ctx context.Context, artistevent *models.ArtistEvent) error {
	return m.db.Insert(ctx, config.Collections.ArtistEventsCollection, artistevent)
}

func (m *MongoArtistRepo) UpdateArtistEventByID(ctx context.Context, artisteventID string, update bson.M) error {
	return m.db.Update(ctx, config.Collections.ArtistEventsCollection, bson.M{"eventid": artisteventID}, update)
}

func (m *MongoArtistRepo) FindArtistEvents(ctx context.Context, artistID string, result *[]models.ArtistEvent) error {
	return m.db.FindMany(ctx, config.Collections.ArtistEventsCollection, bson.M{"artistid": artistID}, result)
}

func (m *MongoArtistRepo) FindArtistEventsByEventAndArtist(ctx context.Context, eventID, artistID string, result *[]models.ArtistEvent) error {
	return m.db.FindMany(ctx, config.Collections.ArtistEventsCollection, bson.M{"eventid": eventID, "artistid": artistID}, result)
}

func (m *MongoArtistRepo) AddArtistToEvent(ctx context.Context, artistEvent models.ArtistEvent) error {
	if err := m.db.Insert(ctx, config.Collections.ArtistEventsCollection, artistEvent); err != nil {
		return err
	}
	return m.db.Update(ctx, config.Collections.EventsCollection, bson.M{"eventid": artistEvent.EventID}, bson.M{"$addToSet": bson.M{"artists": artistEvent.ArtistID}})
}
