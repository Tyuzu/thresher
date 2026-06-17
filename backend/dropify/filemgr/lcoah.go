package filemgr

import (
	"fmt"
	"log"
	"mime/multipart"
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

	return filename, ext, nil
}
