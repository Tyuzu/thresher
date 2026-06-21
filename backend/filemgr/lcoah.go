package filemgr

import (
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
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
	log.Println("[SaveFileForEntityf]->", picType)
	filename, ext, err := saveFileAndProcess(file, header, entity, picType, defaultThumbWidth, userid)
	log.Println("[SaveFileForEntityb]->", picType)
	log.Println("[filename, ext, err]->->->->", filename, ext, err)
	return filename, ext, err
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
	log.Println("[saveFileAndProcess]->->", filename, ext, fullPath)

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
	log.Println("filename, ext", filename, ext)
	return filename, ext, nil
}

// -------------------- Multi-image Upload --------------------

func saveUploadedFiles(r *http.Request, formKey, fileType string, entitytype EntityType, userid string) ([]string, error) {
	files := r.MultipartForm.File[formKey]
	if len(files) == 0 {
		return nil, fmt.Errorf("no %s files uploaded", fileType)
	}

	var ids []string
	entity := entitytype
	picType := PictureType(fileType)

	for _, file := range files {
		origName, err := processSingleImageUpload(file, entity, picType, userid)
		if err != nil {
			return nil, fmt.Errorf("failed to process %s: %w", fileType, err)
		}
		ids = append(ids, origName)
	}

	return ids, nil
}

func processSingleImageUpload(file *multipart.FileHeader, entity EntityType, picType PictureType, userid string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("cannot open image: %w", err)
	}
	defer src.Close()

	log.Println("processSingleImageUpload picType : ", picType)

	origName, ext, err := SaveFileForEntity(src, file, entity, picType, userid)
	if err != nil {
		return "", fmt.Errorf("saving image failed: %w", err)
	}
	return origName + ext, nil
}
