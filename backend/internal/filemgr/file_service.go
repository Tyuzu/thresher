package filemgr

import (
	"fmt"
	"io"
	"mime/multipart"
	log "naevis/utils/logger"
	"net/http"
	"strings"
)

type FileService struct{}

func NewFileService() *FileService {
	return &FileService{}
}

func (fs *FileService) ProcessUploadedFiles(r *http.Request, entityType string, entityId string, userid string) ([]Attachment, error) {
	log.Println("--|--|--|--|")
	_ = entityId

	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		return nil, fmt.Errorf("no files provided")
	}

	entity := EntityType(strings.ToLower(strings.TrimSpace(entityType)))
	var attachments []Attachment

	for fieldName, files := range r.MultipartForm.File {
		picType := normalizePictureKey(fieldName)
		if _, ok := AllowedExtensions[picType]; !ok {
			return nil, fmt.Errorf("unsupported picture type: %s", fieldName)
		}

		for _, fileHeader := range files {
			atts, err := fs.processRegularFile(r, fileHeader, entity, userid, picType)
			if err != nil {
				return nil, fmt.Errorf("failed to process file %s: %w", fileHeader.Filename, err)
			}
			attachments = append(attachments, atts...)
		}
	}

	return attachments, nil
}

func (fs *FileService) processRegularFile(r *http.Request, fileHeader *multipart.FileHeader, entity EntityType, userID string, picType PictureType) ([]Attachment, error) {
	if entity == EntityFeed {
		return fs.processFeedFile(r, fileHeader, entity, userID)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read file header: %w", err)
	}
	if seeker, ok := file.(io.Seeker); ok {
		if _, err := seeker.Seek(0, io.SeekStart); err != nil {
			return nil, fmt.Errorf("failed to reset file pointer: %w", err)
		}
	}

	mimeType := http.DetectContentType(buf[:n])

	switch picType {
	case PicBanner, PicMember, PicPhoto, PicPoster, PicSeating, PicThumb:
		if !strings.HasPrefix(mimeType, "image/") {
			return nil, fmt.Errorf("%s requires an image file", picType)
		}
	case PicVideo:
		if !strings.HasPrefix(mimeType, "video/") {
			return nil, fmt.Errorf("%s requires a video file", picType)
		}
	case PicAudio, PicSong:
		if !strings.HasPrefix(mimeType, "audio/") {
			return nil, fmt.Errorf("%s requires an audio file", picType)
		}
	case PicDocument, PicFile:
	default:
		return nil, fmt.Errorf("unsupported picture type: %s", picType)
	}

	savedName, ext, err := SaveFileForEntity(file, fileHeader, entity, picType, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	if picType == PicAudio || picType == PicSong {
		ext = ".mp3"
	}
	if picType == PicVideo {
		ext = ".mp4"
	}

	return []Attachment{{Filename: savedName, Extension: ext, Key: string(picType)}}, nil
}

func (fs *FileService) processFeedFile(r *http.Request, fileHeader *multipart.FileHeader, entity EntityType, userid string) ([]Attachment, error) {
	postType := strings.ToLower(strings.TrimSpace(r.FormValue("postType")))
	if postType == "" {
		if isVideoFile(fileHeader.Filename) {
			postType = "video"
		} else if isAudioFile(fileHeader.Filename) {
			postType = "audio"
		} else {
			postType = "photo"
		}
	}

	picType := postTypeToImageType(postType)

	if postType == "video" || postType == "audio" {
		savedPath, uniqueID, _, err := SaveUploadedFile(fileHeader, entity, picType, userid)
		if err != nil {
			return nil, fmt.Errorf("failed to save file: %w", err)
		}

		uploadDir := ResolvePath(entity, picType)
		if postType == "video" {
			resolutions, _, err := ProcessVideo(r, savedPath, uploadDir, uniqueID, entity)
			if err != nil {
				return nil, fmt.Errorf("video processing failed: %w", err)
			}
			return []Attachment{{Filename: uniqueID, Extension: ".mp4", Key: string(picType), Resolutions: resolutions}}, nil
		}

		resolutions, _ := ProcessAudio(savedPath, uploadDir, uniqueID, entity)
		return []Attachment{{Filename: uniqueID, Extension: ".mp3", Key: string(picType), Resolutions: resolutions}}, nil
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	savedName, ext, err := SaveFileForEntity(file, fileHeader, entity, picType, userid)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}
	return []Attachment{{Filename: savedName, Extension: ext, Key: string(picType)}}, nil
}
