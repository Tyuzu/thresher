package filemgr

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
	"naevis/infra"
)

const maxUploadBytes = 200 << 20 // 200 MB

type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}

var validEntities = map[string]EntityType{
	"artist":       EntityArtist,
	"baito":        EntityBaito,
	"baito_worker": EntityWorker,
	"blogpost":     EntityBlogPost,
	"chat":         EntityChat,
	"crop":         EntityCrop,
	"event":        EntityEvent,
	"farm":         EntityFarm,
	"feedpost":     EntityFeed,
	"live":         EntityLive,
	"media":        EntityMedia,
	"menu":         EntityMenu,
	"merch":        EntityMerch,
	"music":        EntityMusic,
	"place":        EntityPlace,
	"product":      EntityProduct,
	"recipe":       EntityRecipe,
	"report":       EntityReport,
	"review":       EntityReview,
	"song":         EntitySong,
	"tool":         EntityProduct,
	"user":         EntityUser,
	"vendor":       EntityVendor,
	"worker":       EntityWorker,
}

type EntityMeta struct {
	Collection string
	IDField    string
}

var entityMeta = map[string]EntityMeta{
	"artist":   {Collection: config.Collections.ArtistsCollection, IDField: config.IDField.ArtistId},
	"baito":    {Collection: config.Collections.BaitoCollection, IDField: config.IDField.BaitoId},
	"blogpost": {Collection: config.Collections.BlogPostsCollection, IDField: config.IDField.BlogPostId},
	"chat":     {Collection: config.Collections.ChatsCollection, IDField: config.IDField.ChatId},
	"crop":     {Collection: config.Collections.CropsCollection, IDField: config.IDField.CropId},
	"event":    {Collection: config.Collections.EventsCollection, IDField: config.IDField.EventId},
	"farm":     {Collection: config.Collections.FarmsCollection, IDField: config.IDField.FarmId},
	"feedpost": {Collection: config.Collections.FeedPostsCollection, IDField: config.IDField.FeedPostId},
	"live":     {Collection: "vlive", IDField: "eventid"},
	"media":    {Collection: config.Collections.MediaCollection, IDField: config.IDField.MediaId},
	"menu":     {Collection: config.Collections.MenuCollection, IDField: config.IDField.MenuId},
	"merch":    {Collection: config.Collections.MerchCollection, IDField: config.IDField.MerchId},
	"music":    {Collection: config.Collections.AlbumsCollection, IDField: config.IDField.AlbumId},
	"place":    {Collection: config.Collections.PlacesCollection, IDField: config.IDField.PlaceId},
	"product":  {Collection: config.Collections.ProductCollection, IDField: config.IDField.ProductId},
	"recipe":   {Collection: config.Collections.RecipeCollection, IDField: config.IDField.RecipeId},
	"report":   {Collection: config.Collections.ReportsCollection, IDField: config.IDField.ReportId},
	"review":   {Collection: config.Collections.ReviewsCollection, IDField: config.IDField.ReviewId},
	"song":     {Collection: config.Collections.SongsCollection, IDField: config.IDField.SongId},
	"user":     {Collection: config.Collections.UserCollection, IDField: config.IDField.UserId},
	"vendor":   {Collection: config.Collections.VendorCollection, IDField: config.IDField.VendorId},
	"worker":   {Collection: config.Collections.BaitoWorkerCollection, IDField: config.IDField.BaitoWorkerId},
}

func validateUploadRequest(w http.ResponseWriter, r *http.Request) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if r.Method != http.MethodPost {
		return fmt.Errorf("method must be POST")
	}
	contentType := r.Header.Get("Content-Type")
	remoteURL := strings.TrimSpace(r.FormValue("remoteUrl"))
	if remoteURL == "" && !strings.HasPrefix(contentType, "multipart/") {
		return fmt.Errorf("content-type must be multipart/form-data")
	}
	return nil
}

func convertToAttachments(serviceAttachments []Attachment) []Attachment {
	return append([]Attachment(nil), serviceAttachments...)
}

func updateEntityMedia(app *infra.Deps, entityType string, entityId string, attachments []Attachment) error {
	log.Println("updateEntityMedia:", entityType, entityId, attachments)
	meta, ok := entityMeta[entityType]
	if !ok {
		return fmt.Errorf("unsupported entity type: %s", entityType)
	}

	filter := bson.M{meta.IDField: entityId}
	setFields := bson.M{}
	var photos []string

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
			photos = append(photos, attachment.Filename)
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
	if len(photos) > 0 {
		update["$push"] = bson.M{"photos": bson.M{"$each": photos}}
	}
	if len(update) == 0 {
		return nil
	}

	return app.DB.UpdateOne(context.Background(), meta.Collection, filter, update)
}
