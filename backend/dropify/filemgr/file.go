package filemgr

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
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

func normalizePictureKey(key string) PictureType {
	key = strings.ToLower(strings.TrimSpace(key))

	switch key {
	case "avatar", "gallery", "image", "photo", "seating":
		return PicPhoto
	default:
		return PictureType(key)
	}
}

// ProcessUploadedFiles processes multipart uploads
func (fs *FileService) ProcessUploadedFiles(
	r *http.Request,
	entityType string,
	entityId string,
	userid string,
) ([]Attachment, error) {
	log.Println("--|--|--|--|")

	_ = entityId // reserved for future use

	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		return nil, fmt.Errorf("no files provided")
	}

	entity := EntityType(strings.ToLower(entityType))

	var attachments []Attachment

	for fieldName, files := range r.MultipartForm.File {
		picType := PictureType(strings.ToLower(fieldName))

		if _, ok := AllowedExtensions[picType]; !ok {
			return nil, fmt.Errorf("unsupported picture type: %s", fieldName)
		}

		for _, fileHeader := range files {
			atts, err := fs.processRegularFile(
				r,
				fileHeader,
				entity,
				userid,
				picType,
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

func (fs *FileService) processRegularFile(
	r *http.Request,
	fileHeader *multipart.FileHeader,
	entity EntityType,
	userID string,
	picType PictureType,
) ([]Attachment, error) {

	if entity == EntityFeed {
		return fs.processFeedFile(r, fileHeader, entity, userID)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes for MIME detection
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read file header: %w", err)
	}

	// Reset file pointer so SaveFileForEntity can read from start
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("failed to reset file pointer: %w", err)
	}

	mimeType := http.DetectContentType(buf[:n])

	switch picType {
	case PicBanner,
		PicMember,
		PicPhoto,
		PicPoster,
		PicSeating,
		PicThumb:

		if !strings.HasPrefix(mimeType, "image/") {
			return nil, fmt.Errorf("%s requires an image file", picType)
		}

	case PicVideo:
		if !strings.HasPrefix(mimeType, "video/") {
			return nil, fmt.Errorf("%s requires a video file", picType)
		}

	case PicAudio,
		PicSong:
		if !strings.HasPrefix(mimeType, "audio/") {
			return nil, fmt.Errorf("%s requires an audio file", picType)
		}

	case PicDocument:
		// allow documents

	case PicFile:
		// allow arbitrary files

	default:
		return nil, fmt.Errorf("unsupported picture type: %s", picType)
	}

	log.Println("processRegularFile:", mimeType, picType)

	savedName, ext, err := SaveFileForEntity(
		file,
		fileHeader,
		entity,
		picType,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	log.Println("savedName, ext,", savedName, ext)

	return []Attachment{
		{
			Filename:  savedName,
			Extension: ext,
			Key:       string(picType),
		},
	}, nil
}

// processFeedFile handles feed media uploads
func (fs *FileService) processFeedFile(
	r *http.Request,
	fileHeader *multipart.FileHeader,
	entity EntityType,
	userid string,
) ([]Attachment, error) {

	postType := strings.ToLower(strings.TrimSpace(r.FormValue("postType")))
	log.Println("processFeedFile : ", postType)
	// Auto-detect from filename if postType not provided
	if postType == "" {
		if isVideoFile(fileHeader.Filename) {
			postType = "video"
		} else if isAudioFile(fileHeader.Filename) {
			postType = "audio"
		} else if isImageFile(fileHeader.Filename) {
			postType = "photo"
		} else {
			postType = "photo" // default to photo for unknown files
		}
	}

	picType := postTypeToImageType(postType)

	// Video / audio processing
	if postType == "video" || postType == "audio" {
		savedPath, uniqueID, ext, err := SaveUploadedFile(
			fileHeader,
			entity,
			picType,
			userid,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to save file: %w", err)
		}

		uploadDir := ResolvePath(entity, picType)

		// Video
		if postType == "video" {
			resolutions, _, err := ProcessVideo(
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
		resolutions, _ := ProcessAudio(
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

	// Image/photo processing
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	savedName, ext, err := SaveFileForEntity(
		file,
		fileHeader,
		entity,
		picType,
		userid,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	return []Attachment{
		{
			Filename:  savedName,
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
	case "image/jpg":
		return ".jpg"
	case "audio/x-wav":
		return ".wav"
	case "audio/mp4":
		return ".m4a"
	default:
		return ""
	}
}

// postTypeToImageType maps feed media types
func postTypeToImageType(postType string) PictureType {
	switch strings.ToLower(postType) {
	case "audio":
		return PicAudio
	case "video":
		return PicVideo
	case "poster":
		return PicPoster
	case "banner":
		return PicBanner
	case "document":
		return PicDocument
	case "song":
		return PicSong
	default:
		return PicPhoto
	}
}

// isVideoFile checks if a file is a video based on extension
func isVideoFile(filename string) bool {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".mp4", ".webm", ".avi", ".mov", ".mkv":
		return true
	default:
		return false
	}
}

// isAudioFile checks if a file is audio based on extension
func isAudioFile(filename string) bool {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".mp3", ".wav", ".aac", ".m4a", ".ogg":
		return true
	default:
		return false
	}
}

// isImageFile checks if a file is an image based on extension
func isImageFile(filename string) bool {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return true
	default:
		return false
	}
}

// func getPictureType(fieldName string) (PictureType, error) {
// 	switch strings.ToLower(fieldName) {
// 	case "audio":
// 		return PicAudio, nil
// 	case "banner":
// 		return PicBanner, nil
// 	case "document":
// 		return PicDocument, nil
// 	case "file":
// 		return PicFile, nil
// 	case "member":
// 		return PicMember, nil
// 	case "photo":
// 		return PicPhoto, nil
// 	case "poster":
// 		return PicPoster, nil
// 	case "seating":
// 		return PicSeating, nil
// 	case "song":
// 		return PicSong, nil
// 	case "thumb":
// 		return PicThumb, nil
// 	case "video":
// 		return PicVideo, nil
// 	default:
// 		return "", fmt.Errorf("unsupported picture type: %s", fieldName)
// 	}
// }
