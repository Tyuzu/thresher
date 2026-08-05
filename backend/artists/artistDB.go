package artists

import (
	"context"
	"time"

	"naevis/config"
	"naevis/infra"
	db "naevis/infra/db"
	"naevis/models"
	"naevis/userdata"
)

var (
	EventsCollection       = config.Collections.EventsCollection
	ArtistsCollection      = config.Collections.ArtistsCollection
	SongsCollection        = config.Collections.SongsCollection
	ArtistEventsCollection = config.Collections.ArtistEventsCollection
	SubscribersCollection  = config.Collections.SubscribersCollection
)

func InsertArtist(ctx context.Context, db db.Database, artist *models.Artist) error {
	return db.Insert(ctx, ArtistsCollection, artist)
}

func FindArtistByID(ctx context.Context, db db.Database, artistID string, artist *models.Artist) error {
	return db.FindOne(ctx, ArtistsCollection, map[string]any{"artistid": artistID}, artist)
}

func UpdateArtistByID(ctx context.Context, db db.Database, artistID string, update map[string]any) (any, error) {
	return db.Update(ctx, ArtistsCollection, map[string]any{"artistid": artistID}, map[string]any{"$set": update})
}

func FindArtistEvents(ctx context.Context, db db.Database, artistID string, result *[]models.ArtistEvent) error {
	return db.FindMany(ctx, ArtistEventsCollection, map[string]any{"artistid": artistID}, result)
}

// FindSubscribersForArtist checks if a specific user is subscribed to an artist.
func FindSubscribersForArtist(ctx context.Context, db db.Database, userID, artistID string) (bool, error) {
	var results []map[string]any
	err := db.FindMany(ctx, SubscribersCollection, map[string]any{
		"userid": userID,
		"subscribed": map[string]any{
			"$in": []string{artistID},
		},
	}, &results)

	if err != nil {
		return false, err
	}

	return len(results) > 0, nil
}

func FindArtistsByEventID(ctx context.Context, db db.Database, eventID string, result *[]models.Artist) error {
	return db.FindMany(ctx, ArtistsCollection, map[string]any{"events": eventID}, result)
}

func FindAllArtists(ctx context.Context, db db.Database, result *[]models.Artist) error {
	return db.FindMany(ctx, ArtistsCollection, map[string]any{}, result)
}

func AddArtistMemberDB(ctx context.Context, db db.Database, artistID string, member models.BandMember) (any, error) {
	return db.Update(ctx, ArtistsCollection, map[string]any{"artistid": artistID}, map[string]any{"$push": map[string]any{"members": member}})
}

func UpdateArtistMemberDB(ctx context.Context, db db.Database, artistID, memberID string, update map[string]any) (any, error) {
	return db.Update(ctx, ArtistsCollection, map[string]any{"artistid": artistID, "members.memberid": memberID}, map[string]any{"$set": update})
}

func DeleteArtistMemberDB(ctx context.Context, db db.Database, artistID, memberID string) (any, error) {
	return db.Update(ctx, ArtistsCollection, map[string]any{"artistid": artistID}, map[string]any{"$pull": map[string]any{"members": map[string]any{"memberid": memberID}}})
}

func FindSongsByArtist(ctx context.Context, db db.Database, artistID string, result *[]models.ArtistSong) error {
	return db.FindMany(ctx, SongsCollection, map[string]any{"artistid": artistID, "published": true}, result)
}

func InsertArtistSong(ctx context.Context, db db.Database, song *models.ArtistSong) error {
	return db.Insert(ctx, SongsCollection, song)
}

func UpdateArtistSong(ctx context.Context, db db.Database, artistID, songID string, update map[string]any) (any, error) {
	return db.Update(ctx, SongsCollection, map[string]any{"artistid": artistID, "songid": songID}, map[string]any{"$set": update})
}

func DeleteArtistSong(ctx context.Context, db db.Database, artistID, songID string) error {
	_, err := db.Delete(ctx, SongsCollection, map[string]any{"artistid": artistID, "songid": songID})
	return err
}

func InsertArtistEvent(ctx context.Context, db db.Database, artistevent *models.ArtistEvent) error {
	return db.Insert(ctx, ArtistEventsCollection, artistevent)
}

func UpdateArtistEventByID(ctx context.Context, db db.Database, artisteventID string, update map[string]any) (any, error) {
	return db.Update(ctx, ArtistEventsCollection, map[string]any{"eventid": artisteventID}, update)
}

func FindEventByID(ctx context.Context, db db.Database, eventID string, event *models.Event) error {
	return db.FindOne(ctx, EventsCollection, map[string]any{"eventid": eventID}, event)
}

func FindArtistEventsByEventAndArtist(ctx context.Context, db db.Database, eventID, artistID string, result *[]models.ArtistEvent) error {
	return db.FindMany(ctx, ArtistEventsCollection, map[string]any{"eventid": eventID, "artistid": artistID}, result)
}

func AddArtistToEventDB(ctx context.Context, db db.Database, artistEvent models.ArtistEvent) (any, error) {
	if err := db.Insert(ctx, ArtistEventsCollection, artistEvent); err != nil {
		return nil, err
	}
	return db.Update(ctx, EventsCollection, map[string]any{"eventid": artistEvent.EventID}, map[string]any{"$addToSet": map[string]any{"artists": artistEvent.ArtistID}})
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

// UpdateArtistSongFromPayload maps optional payload fields to query maps and calls UpdateArtistSong.
func UpdateArtistSongFromPayload(ctx context.Context, db db.Database, artistID, songID string, payload songPayload) (any, error) {
	updateFields := map[string]any{}

	assignIfPresent := func(field string, val *string) {
		if val != nil {
			updateFields[field] = *val
		}
	}

	assignIfPresent("title", payload.Title)
	assignIfPresent("genre", payload.Genre)
	assignIfPresent("duration", payload.Duration)
	assignIfPresent("description", payload.Description)
	assignIfPresent("audioUrl", payload.Audio)
	assignIfPresent("poster", payload.Poster)
	assignIfPresent("audioextn", payload.AudioExtn)
	assignIfPresent("posterextn", payload.PosterExtn)

	if len(updateFields) == 0 {
		return nil, ErrNoFieldsToUpdate
	}

	updateFields["updatedAt"] = time.Now()

	return UpdateArtistSong(ctx, db, artistID, songID, updateFields)
}
