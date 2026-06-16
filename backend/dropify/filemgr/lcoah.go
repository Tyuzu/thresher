package filemgr

import (
	"fmt"
	"log"
	"mime/multipart"
	"path/filepath"
	"strings"
)

const (
	defaultThumbWidth = 500
	maxUploadSize     = 10 << 20 // 10 MB
	defaultQuality    = 85
)

// -------------------------
// Public Save Functions
// -------------------------

func SaveFileForEntity(file multipart.File, header *multipart.FileHeader, entity EntityType, picType PictureType, userid string) (string, string, error) {
	log.Println("->[SaveFileForEntity] : no error yet")
	filename, ext, err := saveFileAndProcess(file, header, entity, picType, defaultThumbWidth, userid)
	log.Println("[SaveFileForEntity]->", picType)
	return filename, ext, err
}

func SaveImageWithThumb(file multipart.File, header *multipart.FileHeader, entity EntityType, picType PictureType, thumbWidth int, userid string) (string, string, error) {
	filename, ext, err := saveFileAndProcess(file, header, entity, picType, thumbWidth, userid)
	if err != nil {
		return filename + ext, "", err
	}

	// If thumbnail not already created, return empty string
	thumbName := ""
	fullPath := filepath.Join(ResolvePath(entity, picType), filename)
	if img, _, err := openImage(fullPath); err == nil {
		if img.Bounds().Dx() > thumbWidth || img.Bounds().Dy() > thumbWidth {
			thumbName = userid + ".jpg"
			if err := generateThumbnail(img, entity, thumbName, thumbWidth); err != nil {
				return filename, "", fmt.Errorf("thumbnail failed: %w", err)
			}
		}
	}
	return filename, thumbName, nil
}

// -------------------------
// Internal helper
// -------------------------

func saveMultipartFile(hdr *multipart.FileHeader, entity EntityType, picType PictureType) (string, string, error) {
	file, err := hdr.Open()
	if err != nil {
		return "", "", fmt.Errorf("open %s: %w", hdr.Filename, err)
	}
	defer file.Close()

	return saveFileAndProcess(file, hdr, entity, picType, defaultThumbWidth, "")
}

// -------------------------
// Multipart Form Helpers
// -------------------------

// SaveFormFile saves a single file from a multipart.Form.
// Returns the saved filename or error.
func SaveFormFile(form *multipart.Form, formKey string, entity EntityType, picType PictureType, required bool) (string, error) {
	files := form.File[formKey]
	if len(files) == 0 {
		if required {
			return "", fmt.Errorf("missing required file: %s", formKey)
		}
		return "", nil
	}

	filename, ext, err := saveMultipartFile(files[0], entity, picType)
	return filename + ext, err
}

// SaveFormFiles saves multiple files under the same form key.
// Returns list of saved filenames or partial errors.
func SaveFormFiles(form *multipart.Form, formKey string, entity EntityType, picType PictureType, required bool) ([]string, error) {
	files := form.File[formKey]
	if len(files) == 0 {
		if required {
			return nil, fmt.Errorf("missing required files: %s", formKey)
		}
		return nil, nil
	}

	var saved []string
	var errs []string
	for _, hdr := range files {
		filename, ext, err := saveMultipartFile(hdr, entity, picType)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", hdr.Filename, err))
			continue
		}
		saved = append(saved, filename+ext)
	}

	if len(errs) > 0 {
		return saved, fmt.Errorf("errors saving files: %s", strings.Join(errs, "; "))
	}
	return saved, nil
}

// SaveFormFilesByKeys saves files for multiple keys in the form.
// Returns all successfully saved filenames and any partial errors.
func SaveFormFilesByKeys(form *multipart.Form, keys []string, entity EntityType, picType PictureType, required bool) ([]string, error) {
	var allSaved []string
	var errs []string

	for _, key := range keys {
		saved, err := SaveFormFiles(form, key, entity, picType, required)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", key, err))
		}
		allSaved = append(allSaved, saved...)
	}

	if len(errs) > 0 {
		return allSaved, fmt.Errorf("errors: %s", strings.Join(errs, "; "))
	}
	return allSaved, nil
}

// -------------------------
// Core DRY Helper
// -------------------------

func saveFileAndProcess(file multipart.File, header *multipart.FileHeader, entity EntityType, picType PictureType, thumbWidth int, userid string) (string, string, error) {
	path := ResolvePath(entity, picType)

	log.Println("->[saveFileAndProcess] : no error yet")
	filename, ext, fullPath, err := writeValidatedFile(file, header, path, picType, entity, maxUploadSize, userid)
	if err != nil {
		return "", "", err
	}
	log.Println("[saveFileAndProcess]->->", filename)

	log.Println("->[saveFileAndProcess 1] : no error yet")

	if isImageType(picType) {
		if err := processImage(fullPath, entity, picType, thumbWidth, filename, ext); err != nil {
			return filename, ext, err
		}
		// if err := processImage(fullPath, entity, picType, thumbWidth, filename, ext); err != nil {
		// 	return filename, ext, err
		// }
	} else if picType == PicVideo || isVideoExt(ext) {
		go func(vpath string, ent EntityType, fname string) {
			if thumb, err := generateVideoPoster(vpath, ent, fname); err != nil {
				if LogFunc != nil {
					LogFunc(fmt.Sprintf("warning: video poster generation failed for %s: %v", fname, err), 0, "")
				}
			} else if LogFunc != nil {
				LogFunc(thumb, 0, "image/jpeg")
			}
		}(fullPath, entity, filename+ext)
	}

	return filename, ext, nil
}
