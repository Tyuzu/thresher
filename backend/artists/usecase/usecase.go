package usecase

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/artists/domain"
	"naevis/infra/mq"
	"naevis/models"
)

type ArtistUsecase struct {
	repo domain.ArtistRepository
	mq   mq.MQ
}

func NewArtistUsecase(r domain.ArtistRepository, mqclient mq.MQ) *ArtistUsecase {
	return &ArtistUsecase{repo: r, mq: mqclient}
}

func (u *ArtistUsecase) CreateArtist(ctx context.Context, artist *models.Artist) error {
	if err := u.repo.InsertArtist(ctx, artist); err != nil {
		return err
	}
	if u.mq != nil {
		// best-effort publish; ignore payload for now
		_ = u.mq.Publish(ctx, "artist.created", nil)
	}
	return nil
}

func (u *ArtistUsecase) UpdateArtist(ctx context.Context, artistID string, update bson.M) error {
	return u.repo.UpdateArtistByID(ctx, artistID, update)
}

func (u *ArtistUsecase) DeleteArtist(ctx context.Context, artistID string) error {
	// soft-delete pattern left to repo caller; reuse Update to set deleted flag
	return u.repo.UpdateArtistByID(ctx, artistID, bson.M{"deleted": true})
}

func (u *ArtistUsecase) GetArtistByID(ctx context.Context, artistID string) (models.Artist, error) {
	var out models.Artist
	err := u.repo.FindArtistByID(ctx, artistID, &out)
	return out, err
}

func (u *ArtistUsecase) GetAllArtists(ctx context.Context) ([]models.Artist, error) {
	var out []models.Artist
	if err := u.repo.FindAllArtists(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (u *ArtistUsecase) GetArtistsByEvent(ctx context.Context, eventID string) ([]models.Artist, error) {
	var out []models.Artist
	if err := u.repo.FindArtistsByEventID(ctx, eventID, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// Members
func (u *ArtistUsecase) AddMember(ctx context.Context, artistID string, member models.BandMember) error {
	return u.repo.AddArtistMember(ctx, artistID, member)
}

func (u *ArtistUsecase) UpdateMember(ctx context.Context, artistID, memberID string, update bson.M) error {
	return u.repo.UpdateArtistMember(ctx, artistID, memberID, update)
}

func (u *ArtistUsecase) DeleteMember(ctx context.Context, artistID, memberID string) error {
	return u.repo.DeleteArtistMember(ctx, artistID, memberID)
}

// Songs
func (u *ArtistUsecase) GetSongs(ctx context.Context, artistID string) ([]models.ArtistSong, error) {
	var out []models.ArtistSong
	if err := u.repo.FindSongsByArtist(ctx, artistID, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (u *ArtistUsecase) PostSong(ctx context.Context, song *models.ArtistSong) error {
	return u.repo.InsertArtistSong(ctx, song)
}

func (u *ArtistUsecase) EditSong(ctx context.Context, artistID, songID string, update bson.M) error {
	return u.repo.UpdateArtistSong(ctx, artistID, songID, update)
}

func (u *ArtistUsecase) DeleteSong(ctx context.Context, artistID, songID string) error {
	return u.repo.DeleteArtistSong(ctx, artistID, songID)
}

// Events
func (u *ArtistUsecase) CreateArtistEvent(ctx context.Context, ae *models.ArtistEvent) error {
	return u.repo.InsertArtistEvent(ctx, ae)
}

func (u *ArtistUsecase) UpdateArtistEvent(ctx context.Context, eventID string, update bson.M) error {
	return u.repo.UpdateArtistEventByID(ctx, eventID, update)
}

func (u *ArtistUsecase) GetArtistEvents(ctx context.Context, artistID string) ([]models.ArtistEvent, error) {
	var out []models.ArtistEvent
	if err := u.repo.FindArtistEvents(ctx, artistID, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (u *ArtistUsecase) AddArtistToEvent(ctx context.Context, ae models.ArtistEvent) error {
	return u.repo.AddArtistToEvent(ctx, ae)
}
