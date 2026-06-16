package droping

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/dropify/filemgr"
	"naevis/dropify/services"
	"naevis/infra"
	"naevis/utils"
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
		Collection: "artists",
		IDField:    "artistid",
	},
	"baito": {
		Collection: "baitos",
		IDField:    "baitoid",
	},
	"blogpost": {
		Collection: "blogposts",
		IDField:    "blogpostid",
	},
	"chat": {
		Collection: "chats",
		IDField:    "chatid",
	},
	"crop": {
		Collection: "crops",
		IDField:    "cropid",
	},
	"event": {
		Collection: "events",
		IDField:    "eventid",
	},
	"farm": {
		Collection: "farms",
		IDField:    "farmid",
	},
	"feedpost": {
		Collection: "feedposts",
		IDField:    "feedpostid",
	},
	"live": {
		Collection: "events",
		IDField:    "eventid",
	},
	"media": {
		Collection: "media",
		IDField:    "mediaid",
	},
	"menu": {
		Collection: "menu",
		IDField:    "menuid",
	},
	"merch": {
		Collection: "merch",
		IDField:    "merchid",
	},
	"music": {
		Collection: "albums",
		IDField:    "albumid",
	},
	"place": {
		Collection: "places",
		IDField:    "placeid",
	},
	"product": {
		Collection: "products",
		IDField:    "productid",
	},
	"recipe": {
		Collection: "recipes",
		IDField:    "recipeid",
	},
	"report": {
		Collection: "reports",
		IDField:    "reportid",
	},
	"review": {
		Collection: "reviews",
		IDField:    "reviewid",
	},
	"song": {
		Collection: "songs",
		IDField:    "songid",
	},
	"user": {
		Collection: "users",
		IDField:    "userid",
	},
	"vendor": {
		Collection: "vendors",
		IDField:    "vendorid",
	},
	"worker": {
		Collection: "baitoworkers",
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

// FiledropHandler handles file uploads via multipart/form-data
func FiledropHandler(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		// -------------------------
		// Validate request
		// -------------------------

		if err := validateUploadRequest(w, r); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		// -------------------------
		// Parse multipart form
		// -------------------------

		if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "failed to parse multipart form: "+err.Error())
			return
		}

		// cleanup temp files
		if r.MultipartForm != nil {
			defer r.MultipartForm.RemoveAll()
		}

		// -------------------------
		// Frontend fields
		// -------------------------

		entityType := strings.ToLower(
			strings.TrimSpace(r.FormValue("entityType")),
		)

		entityId := strings.TrimSpace(
			r.FormValue("entityId"),
		)

		remoteURL := strings.TrimSpace(
			r.FormValue("remoteUrl"),
		)

		remoteKey := strings.TrimSpace(
			r.FormValue("remoteKey"),
		)

		// -------------------------
		// Validate entity type
		// -------------------------

		if entityType == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "entityType is required")
			return
		}

		if _, ok := validEntities[entityType]; !ok {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid entityType")
			return
		}

		log.Printf("[Filedrop] entityType=%s entityId=%s", entityType, entityId)

		// -------------------------
		// Service
		// -------------------------

		fileService := services.NewFileService()

		var (
			attachments []services.Attachment
			err         error
		)

		userid := utils.GetUserIDFromRequest(r)

		// -------------------------
		// Remote URL upload
		// -------------------------

		if remoteURL != "" {
			remoteKey = normalizePictureKey(remoteKey)

			if remoteKey == "" {
				utils.RespondWithError(w, http.StatusBadRequest, "remoteKey is required")
				return
			}

			if _, ok := filemgr.AllowedExtensions[filemgr.PictureType(remoteKey)]; !ok {
				utils.RespondWithError(
					w,
					http.StatusBadRequest,
					"invalid remoteKey",
				)
				return
			}

			attachments, err = fileService.ProcessRemoteFile(
				remoteURL,
				remoteKey,
				entityType,
				entityId,
				userid,
			)
		} else {
			// Multipart upload
			if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
				utils.RespondWithError(
					w,
					http.StatusBadRequest,
					"no files uploaded",
				)
				return
			}

			attachments, err = fileService.ProcessUploadedFiles(
				r,
				entityType,
				entityId,
				userid,
			)
		}

		// -------------------------
		// Handle processing errors
		// -------------------------

		if err != nil {
			log.Printf("[Filedrop] processing error: %v", err)

			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"failed to process files: "+err.Error(),
			)
			return
		}

		// -------------------------
		// Update entity document
		// -------------------------

		if entityId != "" {
			if err := updateEntityMedia(
				app,
				entityType,
				entityId,
				attachments,
			); err != nil {
				log.Printf("[Filedrop] failed updating entity media: %v", err)

				utils.RespondWithError(
					w,
					http.StatusInternalServerError,
					"failed to update entity media: "+err.Error(),
				)
				return
			}
		}

		// -------------------------
		// Response
		// -------------------------

		response := convertToAttachments(attachments)
		utils.RespondWithJSON(w, http.StatusOK, response)
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
