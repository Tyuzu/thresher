package filemgr

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"log"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

const (
	virusScanReadLimit = 1 << 20 // 1 MiB
	maxAllowedSizeScan = 1 << 30 // 1 GiB
)

func ScanForViruses(filePath string) error {
	if strings.Contains(strings.ToLower(filePath), "virus") {
		return fmt.Errorf("virus signature matched in filename")
	}

	f, err := os.Open(filePath) // #nosec G304
	if err != nil {
		return fmt.Errorf("scan: open failed: %w", err)
	}
	defer f.Close()

	stat, err := f.Stat()
	if err == nil {
		if stat.Size() <= 0 || stat.Size() > maxAllowedSizeScan {
			return fmt.Errorf("scan: suspicious file size: %d", stat.Size())
		}
	}

	buf := make([]byte, virusScanReadLimit)
	n, err := io.ReadFull(f, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return fmt.Errorf("scan: read failed: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("scan: empty file")
	}

	prefix := bytes.ToLower(buf[:n])

	if n >= 2 && buf[0] == 'M' && buf[1] == 'Z' {
		return fmt.Errorf("scan: executable header detected")
	}
	if n >= 4 && buf[0] == 0x50 && buf[1] == 0x4B && buf[2] == 0x03 && buf[3] == 0x04 {
		return fmt.Errorf("scan: zip archive detected")
	}
	if bytes.Contains(prefix, []byte("<script")) ||
		bytes.Contains(prefix, []byte("<html")) ||
		bytes.Contains(prefix, []byte("<!doctype html")) {
		return fmt.Errorf("scan: html/javascript content detected")
	}
	if bytes.Contains(prefix, []byte("eval(")) && bytes.Contains(prefix, []byte("document")) {
		return fmt.Errorf("scan: suspicious javascript-like content")
	}

	return nil
}

func StripEXIF(img image.Image) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	if err := jpeg.Encode(buf, img, &jpeg.Options{Quality: 90}); err != nil {
		return nil, fmt.Errorf("strip exif: encode failed: %w", err)
	}
	return buf, nil
}

func ExtractImageMetadata(img image.Image, uid string) error {
	if img == nil {
		return fmt.Errorf("extract metadata: nil image")
	}

	bounds := img.Bounds()
	buf, err := StripEXIF(img)
	if err != nil {
		return fmt.Errorf("extract metadata: encoding failed: %w", err)
	}

	size := buf.Len()
	msg := fmt.Sprintf("metadata uid=%s width=%d height=%d size=%d", uid, bounds.Dx(), bounds.Dy(), size)
	if LogFunc != nil {
		LogFunc(msg, int64(size), "metadata")
	} else {
		fmt.Println(msg)
	}
	return nil
}

func ensureSafeFilename(name string, ext string) (string, string) {
	name = strings.TrimSuffix(name, filepath.Ext(name))
	name = strings.TrimSpace(name)
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "_")

	reg := regexp.MustCompile(`[^a-z0-9_\-]`)
	name = reg.ReplaceAllString(name, "")

	if name == "" {
		name = uuid.NewString()
	}

	if ext != "" {
		if !strings.HasPrefix(ext, ".") {
			ext = "." + strings.TrimPrefix(ext, ".")
		}
		ext = strings.ToLower(ext)
	}

	return name, ext
}

func getSafeFilename(original string, ext string, userid string, entity EntityType, picType PictureType, fn func(string) string) (string, string) {
	if entity == EntityUser && picType == PicPhoto {
		return userid, ext
	}

	name := ""
	if fn != nil {
		name = strings.TrimSpace(fn(original))
	} else {
		name = strings.TrimSpace(original)
	}
	if name == "" {
		name = uuid.NewString()
	}
	return ensureSafeFilename(name, ext)
}

func isMIMEAllowed(mimeType string, picType PictureType) bool {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	for _, allowed := range AllowedMIMEs[picType] {
		if strings.EqualFold(allowed, mimeType) {
			return true
		}
	}
	return false
}

func ResolvePath(entity EntityType, picType PictureType) string {
	log.Println("entity", "picType", entity, picType) // #nosec G706
	subfolder := PictureSubfolders[picType]
	if subfolder == "" {
		subfolder = "misc"
	}
	return filepath.Join("static", "uploads", strings.ToLower(string(entity)), strings.ToLower(subfolder))
}

func isImageType(picType PictureType) bool {
	switch picType {
	case PicBanner, PicPhoto, PicMember, PicPoster, PicSeating, PicThumb:
		return true
	default:
		return false
	}
}

func ValidateImageDimensions(img image.Image, maxWidth, maxHeight int) error {
	if img == nil {
		return fmt.Errorf("validate dimensions: nil image")
	}
	bounds := img.Bounds()
	if bounds.Dx() > maxWidth || bounds.Dy() > maxHeight {
		return fmt.Errorf("image dimensions %dx%d exceed max %dx%d", bounds.Dx(), bounds.Dy(), maxWidth, maxHeight)
	}
	return nil
}

func normalizePictureKey(key string) PictureType {
	key = strings.ToLower(strings.TrimSpace(key))
	switch key {
	case "avatar", "gallery", "image", "images", "photo", "photos", "pic", "pics", "seating":
		return PicPhoto
	case "banner", "banners":
		return PicBanner
	case "document", "docs", "doc":
		return PicDocument
	case "file", "files", "attachment", "attachments":
		return PicFile
	case "member", "members":
		return PicMember
	case "poster", "posters":
		return PicPoster
	case "thumb", "thumbnail", "thumbnails":
		return PicThumb
	case "song", "songs":
		return PicSong
	case "audio", "audios":
		return PicAudio
	case "video", "videos":
		return PicVideo
	default:
		return PictureType(key)
	}
}

func mimeToExtension(contentType string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/bmp":
		return ".bmp"
	case "image/svg+xml":
		return ".svg"
	case "application/pdf":
		return ".pdf"
	case "audio/mpeg":
		return ".mp3"
	case "audio/wav", "audio/x-wav":
		return ".wav"
	case "audio/aac":
		return ".aac"
	case "audio/mp4":
		return ".m4a"
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	default:
		return ""
	}
}

func postTypeToImageType(postType string) PictureType {
	switch strings.ToLower(strings.TrimSpace(postType)) {
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

func isVideoFile(filename string) bool {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".mp4", ".webm", ".avi", ".mov", ".mkv", ".m4v":
		return true
	default:
		return false
	}
}

func isAudioFile(filename string) bool {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".mp3", ".wav", ".aac", ".m4a", ".ogg", ".flac":
		return true
	default:
		return false
	}
}

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
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

	if ip := net.ParseIP(host); ip != nil {
		if isPrivateIP(ip) {
			return fmt.Errorf("private network addresses are not allowed")
		}
		return nil
	}

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

func hashURL(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func normalizePath(p string) string {
	if !strings.HasPrefix(p, "/") {
		p = "/" + filepath.ToSlash(p)
	}
	return filepath.ToSlash(p)
}

func generateFilePath(baseDir, uniqueID, extension string) string {
	extension = strings.TrimPrefix(extension, ".")
	return filepath.Join(baseDir, uniqueID+"."+extension)
}

func generateUniqueID() string {
	return uuid.NewString()
}
