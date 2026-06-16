package services

import (
	"fmt"
	"mime/multipart"
	"naevis/dropify/filedrop"
	"naevis/dropify/filemgr"
	"net"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

// FileService provides file operation abstractions
type FileService struct{}

// NewFileService creates a new FileService instance
func NewFileService() *FileService {
	return &FileService{}
}

// Attachment represents a processed file attachment
type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}

func normalizePictureKey(key string) filemgr.PictureType {
	key = strings.ToLower(strings.TrimSpace(key))

	switch key {
	case "avatar", "gallery", "image":
		return filemgr.PicPhoto
	default:
		return filemgr.PictureType(key)
	}
}

// ProcessUploadedFiles processes multipart uploads
func (fs *FileService) ProcessUploadedFiles(
	r *http.Request,
	entityType string,
	entityId string,
	userid string,
) ([]Attachment, error) {

	_ = entityId // reserved for future use

	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		return nil, fmt.Errorf("no files provided")
	}

	entity := filemgr.EntityType(strings.ToLower(entityType))

	var attachments []Attachment

	for fieldKey, files := range r.MultipartForm.File {
		keyLower := strings.ToLower(strings.TrimSpace(fieldKey))

		for _, fileHeader := range files {
			atts, err := fs.processSingleFile(
				r,
				fileHeader,
				keyLower,
				entity,
				userid,
			)
			if err != nil {
				return nil, fmt.Errorf(
					"failed to process file %s: %w",
					fileHeader.Filename,
					err,
				)
			}

			attachments = append(attachments, atts...)
		}
	}

	return attachments, nil
}

// processSingleFile routes uploads by field key
func (fs *FileService) processSingleFile(
	r *http.Request,
	fileHeader *multipart.FileHeader,
	fieldKey string,
	entity filemgr.EntityType,
	userid string,
) ([]Attachment, error) {

	// Feed/feedpost media special handling
	if entity == filemgr.EntityFeed || fieldKey == "feedpost" {
		return fs.processFeedFile(r, fileHeader, fieldKey, entity, userid)
	}

	// Regular uploads
	return fs.processRegularFile(fileHeader, fieldKey, entity, userid)
}

// processFeedFile handles feed media uploads
func (fs *FileService) processFeedFile(
	r *http.Request,
	fileHeader *multipart.FileHeader,
	fieldKey string,
	entity filemgr.EntityType,
	userid string,
) ([]Attachment, error) {

	postType := strings.ToLower(strings.TrimSpace(r.FormValue("postType")))

	// Auto-detect from filename if postType not provided
	if postType == "" {
		if isVideoFile(fileHeader.Filename) {
			postType = "video"
		} else if isAudioFile(fileHeader.Filename) {
			postType = "audio"
		} else {
			postType = "video" // default to video for feed
		}
	}

	picType := postTypeToImageType(postType)

	// Video / audio processing
	if postType == "video" || postType == "audio" {
		savedPath, uniqueID, ext, err := filedrop.SaveUploadedFile(
			fileHeader,
			entity,
			picType,
			userid,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to save file: %w", err)
		}

		uploadDir := filemgr.ResolvePath(entity, picType)

		// Video
		if postType == "video" {
			resolutions, _, err := filedrop.ProcessVideo(
				r,
				savedPath,
				uploadDir,
				uniqueID,
				entity,
			)
			if err != nil {
				return nil, fmt.Errorf("video processing failed: %w", err)
			}

			return []Attachment{
				{
					Filename:    uniqueID,
					Extension:   ext,
					Key:         string(picType),
					Resolutions: resolutions,
				},
			}, nil
		}

		// Audio
		resolutions, _ := filedrop.ProcessAudio(
			savedPath,
			uploadDir,
			uniqueID,
			entity,
		)

		return []Attachment{
			{
				Filename:    uniqueID,
				Extension:   ext,
				Key:         string(picType),
				Resolutions: resolutions,
			},
		}, nil
	}

	// Posters/images/documents/etc. route through regular save path
	return fs.processRegularFile(
		fileHeader,
		string(picType),
		entity,
		userid,
	)
}

// processRegularFile handles standard uploads
func (fs *FileService) processRegularFile(
	fileHeader *multipart.FileHeader,
	fieldKey string,
	entity filemgr.EntityType,
	userID string,
) ([]Attachment, error) {

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	picType := normalizePictureKey(fieldKey)

	if _, ok := filemgr.AllowedExtensions[picType]; !ok {
		return nil, fmt.Errorf("invalid upload key: %s", fieldKey)
	}

	savedName, ext, err := filemgr.SaveFileForEntity(
		file,
		fileHeader,
		entity,
		picType,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	return []Attachment{
		{
			Filename:  savedName + ext,
			Extension: ext,
			Key:       string(picType),
		},
	}, nil
}

// ----------------------------------------------------
// SSRF Protection
// ----------------------------------------------------

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}

	if ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsMulticast() ||
		ip.IsUnspecified() {
		return true
	}

	if ip.String() == "::1" {
		return true
	}

	return false
}

func validateRemoteHost(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid remote URL")
	}

	host := parsed.Hostname()
	if host == "" {
		return fmt.Errorf("invalid host")
	}

	switch strings.ToLower(host) {
	case "localhost", "localhost.localdomain":
		return fmt.Errorf("localhost addresses are not allowed")
	}

	// Direct IP address
	if ip := net.ParseIP(host); ip != nil {
		if isPrivateIP(ip) {
			return fmt.Errorf("private network addresses are not allowed")
		}
		return nil
	}

	// DNS resolution
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("unable to resolve host")
	}

	if len(ips) == 0 {
		return fmt.Errorf("host has no valid addresses")
	}

	for _, ip := range ips {
		if isPrivateIP(ip) {
			return fmt.Errorf("host resolves to a private address")
		}
	}

	return nil
}

// ----------------------------------------------------
// Remote Upload Processing
// ----------------------------------------------------

func mimeToExtension(contentType string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "application/pdf":
		return ".pdf"
	case "audio/mpeg":
		return ".mp3"
	case "audio/wav":
		return ".wav"
	case "audio/aac":
		return ".aac"
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	default:
		return ""
	}
}

// postTypeToImageType maps feed media types
func postTypeToImageType(postType string) filemgr.PictureType {
	switch strings.ToLower(postType) {
	case "audio":
		return filemgr.PicAudio
	case "video":
		return filemgr.PicVideo
	case "poster":
		return filemgr.PicPoster
	case "banner":
		return filemgr.PicBanner
	case "document":
		return filemgr.PicDocument
	case "song":
		return filemgr.PicSong
	default:
		return filemgr.PicPhoto
	}
}

// isVideoFile checks if a file is a video based on extension
func isVideoFile(filename string) bool {
	videoExtensions := map[string]bool{
		".mp4":  true,
		".webm": true,
		".avi":  true,
		".mov":  true,
	}

	ext := strings.ToLower(filepath.Ext(filename))
	return videoExtensions[ext]
}

// isAudioFile checks if a file is audio based on extension
func isAudioFile(filename string) bool {
	audioExtensions := map[string]bool{
		".mp3": true,
		".wav": true,
		".aac": true,
	}

	ext := strings.ToLower(filepath.Ext(filename))
	return audioExtensions[ext]
}
