package droping

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
	"naevis/dropify/filemgr"
	"naevis/dropify/services"
	"naevis/infra"
)

const maxUploadBytes = 200 << 20 // 200 MB

// Attachment represents a file attachment in responses
type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}

// valid entity types
var validEntities = map[string]filemgr.EntityType{
	"artist":       filemgr.EntityArtist,
	"baito":        filemgr.EntityBaito,
	"baito_worker": filemgr.EntityWorker,
	"blogpost":     filemgr.EntityBlogPost,
	"chat":         filemgr.EntityChat,
	"crop":         filemgr.EntityCrop,
	"event":        filemgr.EntityEvent,
	"farm":         filemgr.EntityFarm,
	"feedpost":     filemgr.EntityFeed,
	"live":         filemgr.EntityLive,
	"media":        filemgr.EntityMedia,
	"menu":         filemgr.EntityMenu,
	"merch":        filemgr.EntityMerch,
	"music":        filemgr.EntityMusic,
	"place":        filemgr.EntityPlace,
	"product":      filemgr.EntityProduct,
	"recipe":       filemgr.EntityRecipe,
	"report":       filemgr.EntityReport,
	"review":       filemgr.EntityReview,
	"song":         filemgr.EntitySong,
	"tool":         filemgr.EntityProduct,
	"user":         filemgr.EntityUser,
	"vendor":       filemgr.EntityVendor,
	"worker":       filemgr.EntityWorker,
}

type EntityMeta struct {
	Collection string
	IDField    string
}

var entityMeta = map[string]EntityMeta{
	"artist": {
		Collection: config.Collections.ArtistsCollection,
		IDField:    "artistid",
	},
	"baito": {
		Collection: config.Collections.BaitoCollection,
		IDField:    "baitoid",
	},
	"blogpost": {
		Collection: config.Collections.BlogPostsCollection,
		IDField:    "blogpostid",
	},
	"chat": {
		Collection: config.Collections.ChatsCollection,
		IDField:    "chatid",
	},
	"crop": {
		Collection: config.Collections.CropsCollection,
		IDField:    "cropid",
	},
	"event": {
		Collection: config.Collections.EventsCollection,
		IDField:    "eventid",
	},
	"farm": {
		Collection: config.Collections.FarmsCollection,
		IDField:    "farmid",
	},
	"feedpost": {
		Collection: config.Collections.FeedPostsCollection,
		IDField:    "feedpostid",
	},
	"live": {
		Collection: "vlive",
		IDField:    "eventid",
	},
	"media": {
		Collection: config.Collections.MediaCollection,
		IDField:    "mediaid",
	},
	"menu": {
		Collection: config.Collections.MenuCollection,
		IDField:    "menuid",
	},
	"merch": {
		Collection: config.Collections.MerchCollection,
		IDField:    "merchid",
	},
	"music": {
		Collection: config.Collections.AlbumsCollection,
		IDField:    "albumid",
	},
	"place": {
		Collection: config.Collections.PlacesCollection,
		IDField:    "placeid",
	},
	"product": {
		Collection: config.Collections.ProductCollection,
		IDField:    "productid",
	},
	"recipe": {
		Collection: config.Collections.RecipeCollection,
		IDField:    "recipeid",
	},
	"report": {
		Collection: config.Collections.ReportsCollection,
		IDField:    "reportid",
	},
	"review": {
		Collection: config.Collections.ReviewsCollection,
		IDField:    "reviewid",
	},
	"song": {
		Collection: config.Collections.SongsCollection,
		IDField:    "songid",
	},
	"user": {
		Collection: config.Collections.UserCollection,
		IDField:    "userid",
	},
	"vendor": {
		Collection: config.Collections.VendorCollection,
		IDField:    "vendorid",
	},
	"worker": {
		Collection: config.Collections.BaitoWorkerCollection,
		IDField:    "workerid",
	},
}

func normalizePictureKey(key string) string {
	key = strings.ToLower(strings.TrimSpace(key))

	switch key {
	case "avatar", "gallery", "image":
		return string(filemgr.PicPhoto)
	default:
		return key
	}
}

// validateUploadRequest validates upload request basics
func validateUploadRequest(w http.ResponseWriter, r *http.Request) error {
	// limit body size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)

	// only POST allowed
	if r.Method != http.MethodPost {
		return fmt.Errorf("method must be POST")
	}

	contentType := r.Header.Get("Content-Type")

	// remote uploads may not use multipart
	remoteURL := strings.TrimSpace(
		r.FormValue("remoteUrl"),
	)

	if remoteURL == "" &&
		!strings.HasPrefix(contentType, "multipart/") {
		return fmt.Errorf(
			"content-type must be multipart/form-data",
		)
	}

	return nil
}

// convertToAttachments converts service attachments to response format
func convertToAttachments(
	serviceAttachments []services.Attachment,
) []Attachment {
	attachments := make(
		[]Attachment,
		len(serviceAttachments),
	)

	for i, sa := range serviceAttachments {
		attachments[i] = Attachment{
			Filename:    sa.Filename,
			Extension:   sa.Extension,
			Key:         sa.Key,
			Resolutions: sa.Resolutions,
		}
	}

	return attachments
}

// updateEntityMedia updates the mongo document for the entity
func updateEntityMedia(app *infra.Deps, entityType string, entityId string, attachments []services.Attachment) error {
	meta, ok := entityMeta[entityType]
	if !ok {
		return fmt.Errorf("unsupported entity type: %s", entityType)
	}

	filter := bson.M{
		meta.IDField: entityId,
	}

	setFields := bson.M{}
	var photos []string

	for _, attachment := range attachments {
		key := filemgr.PictureType(
			strings.ToLower(
				strings.TrimSpace(attachment.Key),
			),
		)

		switch key {
		case filemgr.PicBanner:
			setFields["banner"] = attachment.Filename

		case filemgr.PicMember:
			setFields["member"] = attachment.Filename

		case filemgr.PicPoster:
			setFields["poster"] = attachment.Filename

		case filemgr.PicThumb:
			setFields["thumb"] = attachment.Filename

		case filemgr.PicSeating:
			setFields["seating"] = attachment.Filename

		case filemgr.PicPhoto:
			photos = append(photos, attachment.Filename)

		case filemgr.PicVideo:
			setFields["video"] = attachment.Filename

		case filemgr.PicAudio:
			setFields["audio"] = attachment.Filename

		case filemgr.PicSong:
			setFields["song"] = attachment.Filename

		case filemgr.PicDocument:
			setFields["document"] = attachment.Filename

		case filemgr.PicFile:
			setFields["file"] = attachment.Filename
		}
	}

	update := bson.M{}

	if len(setFields) > 0 {
		update["$set"] = setFields
	}

	if len(photos) > 0 {
		update["$push"] = bson.M{
			"photos": bson.M{
				"$each": photos,
			},
		}
	}

	if len(update) == 0 {
		return nil
	}

	return app.DB.UpdateOne(
		context.Background(),
		meta.Collection,
		filter,
		update,
	)
}
