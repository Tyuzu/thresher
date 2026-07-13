package artists

import (
	"context"
	"time"

	"naevis/config"
	"naevis/infra"
	db "naevis/infra/db"
	"naevis/models"
	"naevis/userdata"

	"go.mongodb.org/mongo-driver/bson"
)

var EventsCollection = config.Collections.EventsCollection
var ArtistsCollection = config.Collections.ArtistsCollection
var SongsCollection = config.Collections.SongsCollection
var ArtistEventsCollection = config.Collections.ArtistEventsCollection
var SubscribersCollection = config.Collections.SubscribersCollection

func InsertArtist(ctx context.Context, db db.Database, artist *models.Artist) error {
	return db.Insert(ctx, ArtistsCollection, artist)
}

func FindArtistByID(ctx context.Context, db db.Database, artistID string, artist *models.Artist) error {
	return db.FindOne(ctx, ArtistsCollection, bson.M{"artistid": artistID}, artist)
}

func UpdateArtistByID(ctx context.Context, db db.Database, artistID string, update bson.M) error {
	return db.Update(ctx, ArtistsCollection, bson.M{"artistid": artistID}, bson.M{"$set": update})
}

func FindArtistEvents(ctx context.Context, db db.Database, artistID string, result *[]models.ArtistEvent) error {
	return db.FindMany(ctx, ArtistEventsCollection, bson.M{"artistid": artistID}, result)
}

func FindSubscribersForArtist(ctx context.Context, db db.Database, userID, artistID string, result *[]bson.M) error {
	return db.FindMany(ctx, SubscribersCollection, bson.M{
		"userid": userID,
		"subscribed": bson.M{
			"$in": []string{artistID},
		},
	}, result)
}

func FindArtistsByEventID(ctx context.Context, db db.Database, eventID string, result *[]models.Artist) error {
	return db.FindMany(ctx, ArtistsCollection, bson.M{"events": eventID}, result)
}

func FindAllArtists(ctx context.Context, db db.Database, result *[]models.Artist) error {
	return db.FindMany(ctx, ArtistsCollection, bson.M{}, result)
}

func AddArtistMemberDB(ctx context.Context, db db.Database, artistID string, member models.BandMember) error {
	return db.Update(ctx, ArtistsCollection, bson.M{"artistid": artistID}, bson.M{"$push": bson.M{"members": member}})
}

func UpdateArtistMemberDB(ctx context.Context, db db.Database, artistID, memberID string, update bson.M) error {
	return db.Update(ctx, ArtistsCollection, bson.M{"artistid": artistID, "members.memberid": memberID}, bson.M{"$set": update})
}

func DeleteArtistMemberDB(ctx context.Context, db db.Database, artistID, memberID string) error {
	return db.Update(ctx, ArtistsCollection, bson.M{"artistid": artistID}, bson.M{"$pull": bson.M{"members": bson.M{"memberid": memberID}}})
}

func FindSongsByArtist(ctx context.Context, db db.Database, artistID string, result *[]models.ArtistSong) error {
	return db.FindMany(ctx, SongsCollection, bson.M{"artistid": artistID, "published": true}, result)
}

func InsertArtistSong(ctx context.Context, db db.Database, song *models.ArtistSong) error {
	return db.Insert(ctx, SongsCollection, song)
}

func UpdateArtistSong(ctx context.Context, db db.Database, artistID, songID string, update bson.M) error {
	return db.Update(ctx, SongsCollection, bson.M{"artistid": artistID, "songid": songID}, bson.M{"$set": update})
}

func DeleteArtistSong(ctx context.Context, db db.Database, artistID, songID string) error {
	_, err := db.Delete(ctx, SongsCollection, bson.M{"artistid": artistID, "songid": songID})
	return err
}

func InsertArtistEvent(ctx context.Context, db db.Database, artistevent *models.ArtistEvent) error {
	return db.Insert(ctx, ArtistEventsCollection, artistevent)
}

func UpdateArtistEventByID(ctx context.Context, db db.Database, artisteventID string, update bson.M) error {
	return db.Update(ctx, ArtistEventsCollection, bson.M{"eventid": artisteventID}, update)
}

func FindEventByID(ctx context.Context, db db.Database, eventID string, event *models.Event) error {
	return db.FindOne(ctx, EventsCollection, bson.M{"eventid": eventID}, event)
}

func FindArtistEventsByEventAndArtist(ctx context.Context, db db.Database, eventID, artistID string, result *[]models.ArtistEvent) error {
	return db.FindMany(ctx, ArtistEventsCollection, bson.M{"eventid": eventID, "artistid": artistID}, result)
}

func AddArtistToEventDB(ctx context.Context, db db.Database, artistEvent models.ArtistEvent) error {
	if err := db.Insert(ctx, ArtistEventsCollection, artistEvent); err != nil {
		return err
	}
	return db.Update(ctx, EventsCollection, bson.M{"eventid": artistEvent.EventID}, bson.M{"$addToSet": bson.M{"artists": artistEvent.ArtistID}})
}

func AddEventToDB(ctx context.Context, app *infra.Deps, artistEvent models.ArtistEvent) error {
	var event models.Event
	dateString := artistEvent.Date
	layout := "2006-01-02"
	dateToSave, _ := time.Parse(layout, dateString)

	event.CreatorID = artistEvent.CreatorID
	event.CreatedAt = time.Now().UTC()
	event.Date = dateToSave.UTC()
	event.Status = "active"
	event.FAQs = []models.FAQ{}
	event.EventID = artistEvent.EventID
	event.Artists = []string{artistEvent.ArtistID}
	event.Title = artistEvent.Title
	event.Location = artistEvent.Venue
	event.Published = "draft"
	event.Category = "concert"

	if err := app.DB.Insert(ctx, EventsCollection, event); err != nil {
		return err
	}

	userdata.SetUserData("event", event.EventID, artistEvent.ArtistID, "", "", app)
	return nil
}
