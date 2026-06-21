package filemgr

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
)

// -------------------------
// Image/Video Processing
// -------------------------

func processImage(
	fullPath string,
	entity EntityType,
	picType PictureType,
	thumbWidth int,
	filename,
	ext string,
) error {

	_ = picType

	img, _, err := openImage(fullPath)
	if err != nil {
		if LogFunc != nil {
			LogFunc(
				fmt.Sprintf(
					"image decode failed for %s: %v",
					fullPath,
					err,
				),
				0,
				"unknown",
			)
		}
		return fmt.Errorf("open image %s: %w", fullPath, err)
	}

	newPath, err := normalizeImageFormat(fullPath, ext, img)
	if err != nil {
		return err
	}

	if newPath != fullPath {
		fullPath = newPath
		ext = ".png"
	}

	if thumbWidth <= 0 {
		return fmt.Errorf("invalid thumbnail width: %d", thumbWidth)
	}

	// Generate thumbnail synchronously.
	imgCopy := imaging.Clone(img)

	thumbName := filename + ".jpg"

	if err := generateThumbnail(
		imgCopy,
		entity,
		thumbName,
		thumbWidth,
	); err != nil {

		if LogFunc != nil {
			LogFunc(
				fmt.Sprintf(
					"thumbnail failed for %s: %v",
					thumbName,
					err,
				),
				0,
				"",
			)
		}

		return fmt.Errorf(
			"generate thumbnail %s: %w",
			thumbName,
			err,
		)
	}

	// Metadata extraction remains non-critical.
	metaImg := imaging.Clone(img)

	go func() {
		if err := ExtractImageMetadata(
			metaImg,
			generateUniqueID(),
		); err != nil && LogFunc != nil {

			LogFunc(
				fmt.Sprintf(
					"warning: metadata extraction failed for %s: %v",
					filepath.Base(fullPath),
					err,
				),
				0,
				"",
			)
		}
	}()

	if LogFunc != nil {
		LogFunc(
			filepath.Base(fullPath),
			0,
			"image/png",
		)
	}

	return nil
}

func openImage(path string) (image.Image, string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, "", fmt.Errorf("open image: %w", err)
	}
	defer f.Close()
	img, format, err := image.Decode(f)
	return img, format, err
}

// -------------------------
// Thumbnail & Poster
// -------------------------

func generateThumbnail(
	img image.Image,
	entity EntityType,
	baseFilename string,
	thumbWidth int,
) error {

	if img == nil {
		return fmt.Errorf("nil image")
	}

	if thumbWidth <= 0 {
		return fmt.Errorf(
			"invalid thumbnail width: %d",
			thumbWidth,
		)
	}

	resized := imaging.Resize(
		img,
		thumbWidth,
		0,
		imaging.Lanczos,
	)

	name := strings.TrimSuffix(
		baseFilename,
		filepath.Ext(baseFilename),
	) + ".jpg"

	path := filepath.Join(
		ResolvePath(entity, PicThumb),
		name,
	)

	log.Printf(
		"[thumbnail] creating: %s",
		path,
	)

	if err := os.MkdirAll(
		filepath.Dir(path),
		0o755,
	); err != nil {

		return fmt.Errorf(
			"mkdir %s: %w",
			filepath.Dir(path),
			err,
		)
	}

	out, err := os.Create(path)
	if err != nil {
		return fmt.Errorf(
			"create thumbnail %s: %w",
			path,
			err,
		)
	}

	defer out.Close()

	if err := jpeg.Encode(
		out,
		resized,
		&jpeg.Options{
			Quality: defaultQuality,
		},
	); err != nil {

		_ = os.Remove(path)

		return fmt.Errorf(
			"encode thumbnail %s: %w",
			path,
			err,
		)
	}

	if err := out.Sync(); err != nil {
		return fmt.Errorf(
			"sync thumbnail %s: %w",
			path,
			err,
		)
	}

	if LogFunc != nil {
		LogFunc(
			path,
			0,
			"image/jpeg",
		)
	}

	log.Printf(
		"[thumbnail] created successfully: %s",
		path,
	)

	return nil
}

// -------------------------
// Image Normalization
// -------------------------

func normalizeImageFormat(fullPath, ext string, img image.Image) (string, error) {
	if ext == ".png" {
		return fullPath, nil
	}
	pngPath := strings.TrimSuffix(fullPath, ext) + ".png"
	out, err := os.Create(pngPath)
	if err != nil {
		return fullPath, fmt.Errorf("create png %s: %w", pngPath, err)
	}
	defer out.Close()
	if err := png.Encode(out, img); err != nil {
		_ = os.Remove(pngPath)
		return fullPath, fmt.Errorf("encode png: %w", err)
	}
	_ = os.Remove(fullPath)
	return pngPath, nil
}

// -------------------------
// File Validation & Writing
// -------------------------
func writeValidatedFile(
	reader io.Reader,
	header *multipart.FileHeader,
	destDir string,
	picType PictureType,
	entitytype EntityType,
	maxSize int64,
	userid string,
) (string, string, string, error) {

	log.Println("->[writeValidatedFile]")
	log.Println(destDir, picType, entitytype, maxSize, userid)

	// Read enough bytes for MIME detection
	buf := make([]byte, 512)
	n, err := io.ReadFull(io.LimitReader(reader, 512), buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return "", "", "", fmt.Errorf("read header: %w", err)
	}

	mimeType := strings.ToLower(http.DetectContentType(buf[:n]))

	// Fallback to multipart MIME if detector is unsure
	if mimeType == "application/octet-stream" {
		formMime := strings.ToLower(header.Header.Get("Content-Type"))
		if formMime != "" {
			mimeType = formMime
		}
	}

	if !isMIMEAllowed(mimeType, picType) {
		return "", "", "", fmt.Errorf(
			"%w: %s for %s",
			ErrInvalidMIME,
			mimeType,
			picType,
		)
	}

	// Derive extension from validated MIME, never trust header.Filename
	var safeExt string

	switch mimeType {
	case "image/jpeg":
		safeExt = ".jpg"

	case "image/png":
		safeExt = ".png"

	case "image/gif":
		safeExt = ".gif"

	case "image/webp":
		safeExt = ".webp"

	case "image/bmp":
		safeExt = ".bmp"

	case "image/svg+xml":
		safeExt = ".svg"

	case "video/mp4":
		safeExt = ".mp4"

	case "video/webm":
		safeExt = ".webm"

	case "video/ogg":
		safeExt = ".ogv"

	case "audio/mpeg":
		safeExt = ".mp3"

	case "audio/wav":
		safeExt = ".wav"

	case "audio/ogg":
		safeExt = ".ogg"

	case "application/pdf":
		safeExt = ".pdf"

	default:
		return "", "", "", fmt.Errorf(
			"unsupported mime type: %s",
			mimeType,
		)
	}

	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", "", "", fmt.Errorf(
			"mkdir %s: %w",
			destDir,
			err,
		)
	}

	// Generate safe server-side filename
	filenameOnly, finalExt := getSafeFilename(
		"",
		safeExt,
		userid,
		entitytype,
		picType,
		nil,
	)

	fullPath := filepath.Join(destDir, filenameOnly+finalExt)

	out, err := os.OpenFile(
		fullPath,
		os.O_CREATE|os.O_WRONLY|os.O_TRUNC,
		0o644,
	)
	if err != nil {
		return "", "", "", fmt.Errorf(
			"create %s: %w",
			fullPath,
			err,
		)
	}
	defer out.Close()

	if _, err := out.Write(buf[:n]); err != nil {
		return "", "", "", fmt.Errorf(
			"write header: %w",
			err,
		)
	}

	limit := maxSize - int64(n) + 1

	written, err := io.Copy(
		out,
		io.LimitReader(
			reader,
			limit,
		),
	)
	if err != nil {
		return "", "", "", fmt.Errorf(
			"write body: %w",
			err,
		)
	}

	totalWritten := written + int64(n)

	if maxSize > 0 && totalWritten > maxSize {
		_ = os.Remove(fullPath)
		return "", "", "", ErrFileTooLarge
	}

	if err := ScanForViruses(fullPath); err != nil {
		_ = os.Remove(fullPath)
		return "", "", "", fmt.Errorf(
			"virus scan failed: %w",
			err,
		)
	}

	if LogFunc != nil {
		LogFunc(
			filenameOnly+finalExt,
			totalWritten,
			mimeType,
		)
	}

	log.Printf(
		"saved file: %s%s (%s)",
		filenameOnly,
		finalExt,
		mimeType,
	)

	return filenameOnly, finalExt, fullPath, nil
}

// -------------------------
// Utilities
// -------------------------

func generateUniqueID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func isVideoExt(ext string) bool {
	switch strings.ToLower(ext) {
	case ".mp4", ".mov", ".mkv", ".webm", ".avi", ".flv", ".m4v":
		return true
	default:
		return false
	}
}
