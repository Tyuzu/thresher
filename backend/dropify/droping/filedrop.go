package droping

import (
	"log"
	"naevis/dropify/filemgr"
	"naevis/dropify/services"
	"naevis/infra"
	"naevis/utils"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
)

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
