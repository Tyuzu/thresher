package filemgr

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
)

func processImage(fullPath string, entity EntityType, picType PictureType, thumbWidth int, filename, ext string) (string, string, error) {
	_ = picType

	img, _, err := openImage(fullPath)
	if err != nil {
		if LogFunc != nil {
			LogFunc(fmt.Sprintf("image decode failed for %s: %v", fullPath, err), 0, "unknown")
		}
		return fullPath, ext, fmt.Errorf("open image %s: %w", fullPath, err)
	}

	if err := ValidateImageDimensions(img, 12000, 12000); err != nil {
		return fullPath, ext, err
	}

	finalPath := fullPath
	finalExt := ext

	if strings.ToLower(ext) != ".png" {
		finalPath, err = normalizeImageFormat(fullPath, ext, img)
		if err != nil {
			return fullPath, ext, err
		}
		finalExt = filepath.Ext(finalPath)
	}

	if thumbWidth <= 0 {
		return finalPath, finalExt, fmt.Errorf("invalid thumbnail width: %d", thumbWidth)
	}

	imgCopy := imaging.Clone(img)
	if err := generateThumbnail(imgCopy, entity, filename+".jpg", thumbWidth); err != nil {
		if LogFunc != nil {
			LogFunc(fmt.Sprintf("thumbnail failed for %s: %v", filename, err), 0, "")
		}
		return finalPath, finalExt, fmt.Errorf("generate thumbnail %s: %w", filename, err)
	}

	metaImg := imaging.Clone(img)
	go func() {
		if err := ExtractImageMetadata(metaImg, generateUniqueID()); err != nil && LogFunc != nil {
			LogFunc(fmt.Sprintf("warning: metadata extraction failed for %s: %v", filepath.Base(finalPath), err), 0, "")
		}
	}()

	if LogFunc != nil {
		LogFunc(filepath.Base(finalPath), 0, "image/png")
	}
	return finalPath, finalExt, nil
}

func openImage(path string) (image.Image, string, error) {
	f, err := os.Open(path) // #nosec G703 G304
	if err != nil {
		return nil, "", fmt.Errorf("open image: %w", err)
	}
	defer f.Close()
	img, format, err := image.Decode(f)
	return img, format, err
}

func generateThumbnail(img image.Image, entity EntityType, baseFilename string, thumbWidth int) error {
	if img == nil {
		return fmt.Errorf("nil image")
	}
	if thumbWidth <= 0 {
		return fmt.Errorf("invalid thumbnail width: %d", thumbWidth)
	}

	resized := imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)
	name := strings.TrimSuffix(baseFilename, filepath.Ext(baseFilename)) + ".jpg"
	path := filepath.Join(ResolvePath(entity, PicThumb), name)

	log.Printf("[thumbnail] creating: %s", path) // #nosec G706

	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil { // #nosec G703
		return fmt.Errorf("mkdir %s: %w", filepath.Dir(path), err)
	}

	out, err := os.Create(path) // #nosec G703 G304
	if err != nil {
		return fmt.Errorf("create thumbnail %s: %w", path, err)
	}
	defer out.Close()

	if err := jpeg.Encode(out, resized, &jpeg.Options{Quality: defaultQuality}); err != nil {
		_ = os.Remove(path) // #nosec G703
		return fmt.Errorf("encode thumbnail %s: %w", path, err)
	}
	if err := out.Sync(); err != nil {
		return fmt.Errorf("sync thumbnail %s: %w", path, err)
	}

	if LogFunc != nil {
		LogFunc(path, 0, "image/jpeg")
	}
	log.Printf("[thumbnail] created successfully: %s", path) // #nosec G706
	return nil
}

func normalizeImageFormat(fullPath, ext string, img image.Image) (string, error) {
	if strings.EqualFold(ext, ".png") {
		return fullPath, nil
	}
	pngPath := strings.TrimSuffix(fullPath, ext) + ".png"
	out, err := os.Create(pngPath) // #nosec G703 G304
	if err != nil {
		return fullPath, fmt.Errorf("create png %s: %w", pngPath, err)
	}
	defer out.Close()

	if err := png.Encode(out, img); err != nil {
		_ = os.Remove(pngPath) // #nosec G703
		return fullPath, fmt.Errorf("encode png: %w", err)
	}
	_ = os.Remove(fullPath) // #nosec G703
	return pngPath, nil
}

func generateVideoPoster(videoPath string, entity EntityType, baseFilename string) (string, error) {
	thumbName := strings.TrimSuffix(baseFilename, filepath.Ext(baseFilename)) + ".jpg"
	thumbDir := ResolvePath(entity, PicThumb)
	thumbPath := filepath.Join(thumbDir, thumbName)
	if err := os.MkdirAll(thumbDir, 0o750); err != nil {
		return "", fmt.Errorf("mkdir %s: %w", thumbDir, err)
	}
	if err := CreatePoster(videoPath, thumbPath); err != nil {
		return "", err
	}
	return thumbName, nil
}
