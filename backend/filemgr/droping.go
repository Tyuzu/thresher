package filemgr

import (
	"fmt"
	"net/http"
	"strings"

	"naevis/filemgr/domain"
)

const maxUploadBytes = 200 << 20 // 200 MB

type Attachment = domain.Attachment

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
