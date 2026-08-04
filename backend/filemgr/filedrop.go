package filemgr

import (
	"net/http"
	"strings"

	"naevis/filemgr/repo"
	"naevis/filemgr/usecase"
	"naevis/infra"
	"naevis/utils"
	log "naevis/utils/logger"
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

		uc := usecase.NewFileUsecase(repo.NewMongoRepo(app.DB), app.MQ)

		if entityId != "" {
			if err := uc.UpdateEntityMedia(ctx, entityType, entityId, attachments); err != nil {
				log.Printf("[Filedrop] failed updating entity media: %v", err)
				utils.RespondWithError(w, http.StatusInternalServerError, "failed to update entity media: "+err.Error())
				return
			}
		}

		if err := uc.PublishFileCreatedEvent(ctx, userid, entityType, entityId, attachments); err != nil {
			log.Printf("[Filedrop] failed to publish FileCreatedEvent: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, convertToAttachments(attachments))
	}
}
