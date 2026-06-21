// dropify/filedrop/imgup.go

package filemgr

import (
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
)

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
