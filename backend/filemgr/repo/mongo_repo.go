package repo

import (
	"context"
	"fmt"
	"strings"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/filemgr/domain"
	db "naevis/infra/db"
)

type PictureType string

const (
	PicAudio    PictureType = "audio"
	PicBanner   PictureType = "banner"
	PicDocument PictureType = "document"
	PicFile     PictureType = "file"
	PicMember   PictureType = "member"
	PicPhoto    PictureType = "photo"
	PicImage    PictureType = "images"
	PicPoster   PictureType = "poster"
	PicSeating  PictureType = "seating"
	PicSong     PictureType = "song"
	PicThumb    PictureType = "thumb"
	PicVideo    PictureType = "video"
)

type MongoEntityRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.EntityRepository {
	return &MongoEntityRepo{db: d}
}

func (m *MongoEntityRepo) UpdateEntityMedia(ctx context.Context, entityType string, entityId string, attachments []domain.Attachment) error {
	meta, ok := domain.GetEntityMeta(entityType)
	if !ok {
		return fmt.Errorf("unsupported entity type: %s", entityType)
	}

	filter := bson.M{meta.IDField: entityId}
	setFields := bson.M{}
	var images []string

	for _, attachment := range attachments {
		key := PictureType(strings.ToLower(strings.TrimSpace(attachment.Key)))
		switch key {
		case PicBanner:
			setFields["banner"] = attachment.Filename
		case PicMember:
			setFields["member"] = attachment.Filename
		case PicPoster:
			setFields["poster"] = attachment.Filename
		case PicThumb:
			setFields["thumb"] = attachment.Filename
		case PicSeating:
			setFields["seating"] = attachment.Filename
		case PicPhoto:
			setFields["photo"] = attachment.Filename
		case PicImage:
			images = append(images, attachment.Filename)
		case PicVideo:
			setFields["video"] = attachment.Filename
		case PicAudio:
			setFields["audio"] = attachment.Filename
		case PicSong:
			setFields["song"] = attachment.Filename
		case PicDocument:
			setFields["document"] = attachment.Filename
		case PicFile:
			setFields["file"] = attachment.Filename
		}
	}

	update := bson.M{}
	if len(setFields) > 0 {
		update["$set"] = setFields
	}
	if len(images) > 0 {
		update["$push"] = bson.M{"images": bson.M{"$each": images}}
	}
	if len(update) == 0 {
		return nil
	}

	return m.db.UpdateOne(ctx, meta.Collection, filter, update)
}
