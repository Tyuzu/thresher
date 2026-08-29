package filemgr

import (
	"encoding/json"
	"net/http"
	"strings"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"
	log "scav/utils/logger"
)

func FiledropHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if err := validateUploadRequest(w, r); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		// FIX 1: Pass 'w' (http.ResponseWriter) to MaxBytesReader instead of 'nil' to prevent runtime panic
		r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)

		if err := r.ParseMultipartForm(maxUploadBytes); err != nil { // #nosec G120
			utils.RespondWithError(w, http.StatusBadRequest, "failed to parse multipart form: "+err.Error())
			return
		}

		// FIX 2: Always clean up temporary files created on disk by ParseMultipartForm
		if r.MultipartForm != nil {
			defer func() {
				if err := r.MultipartForm.RemoveAll(); err != nil {
					log.Printf("[Filedrop] failed to remove multipart temp files: %v", err)
				}
			}()
		}

		entityType := strings.ToLower(strings.TrimSpace(r.FormValue("entityType")))
		entityId := strings.TrimSpace(r.FormValue("entityId"))
		remoteURL := strings.TrimSpace(r.FormValue("remoteUrl"))
		remoteKey := strings.TrimSpace(r.FormValue("remoteKey"))

		if entityType == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "entityType is required")
			return
		}

		if _, ok := validEntities[entityType]; !ok {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid entityType")
			return
		}

		log.Printf("[Filedrop] entityType=%s entityId=%s", entityType, entityId) // #nosec G706

		fileService := NewFileService()
		userid := utils.GetUserIDFromRequest(r)

		var (
			attachments []Attachment
			err         error
		)

		if remoteURL != "" {
			remoteKey = string(normalizePictureKey(remoteKey))
			if remoteKey == "" {
				utils.RespondWithError(w, http.StatusBadRequest, "remoteKey is required")
				return
			}
			if _, ok := AllowedExtensions[PictureType(remoteKey)]; !ok {
				utils.RespondWithError(w, http.StatusBadRequest, "invalid remoteKey")
				return
			}
			attachments, err = fileService.ProcessRemoteFile(remoteURL, remoteKey, entityType, entityId, userid)
		} else {
			if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
				utils.RespondWithError(w, http.StatusBadRequest, "no files uploaded")
				return
			}
			attachments, err = fileService.ProcessUploadedFiles(r, entityType, entityId, userid)
		}

		if err != nil {
			log.Printf("[Filedrop] processing error: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "failed to process files: "+err.Error())
			return
		}

		if entityId != "" {
			if _, err := updateEntityMedia(app, entityType, entityId, attachments); err != nil {
				log.Printf("[Filedrop] failed updating entity media: %v", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "failed to update entity media: "+err.Error())
				return
			}
		}

		// FIX 3: Populate MQ event payload with actual metadata instead of an empty struct
		payload := mqevent.FileCreatedPayload{
			UserID:     userid,
			EntityType: entityType,
			EntityID:   entityId,
			Count:      len(attachments),
		}

		mqpayload, err := json.Marshal(payload)

		mq.PublishWithMeta(ctx, app.MQ, mqevent.FileCreatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, convertToAttachments(attachments))
	}
}
