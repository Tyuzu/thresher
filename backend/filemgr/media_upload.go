package filemgr

import (
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

type MediaType string

const (
	Video MediaType = "video"
	Audio MediaType = "audio"
)

type MediaResult struct {
	Resolutions []int
	Paths       []string
	IDs         []string
}

type mediaProcessor func(r *http.Request, savedPath, uploadDir, uniqueID string, entity EntityType) ([]int, []string, error)

var mediaPicTypes = map[MediaType]PictureType{
	Video: PicVideo,
	Audio: PicAudio,
}

var mediaProcessors = map[MediaType]mediaProcessor{
	Video: ProcessVideo,
	Audio: func(r *http.Request, savedPath, uploadDir, uniqueID string, entity EntityType) ([]int, []string, error) {
		res, paths := processAudio(savedPath, uploadDir, uniqueID, entity)
		return res, paths, nil
	},
}

func ProcessMediaUpload(r *http.Request, formKey string, mediaType MediaType, entity EntityType, userid string) (*MediaResult, error) {
	file, err := getUploadedFile(r, formKey)
	if err != nil || file == nil {
		return nil, fmt.Errorf("no file uploaded: %w", err)
	}

	picType, ok := mediaPicTypes[mediaType]
	if !ok {
		return nil, fmt.Errorf("unsupported media type: %s", mediaType)
	}

	log.Println("ProcessMediaUpload :", picType)

	savedPath, uniqueID, _, err := SaveUploadedFile(file, entity, picType, userid)
	if err != nil {
		return nil, err
	}

	processor, ok := mediaProcessors[mediaType]
	if !ok {
		return nil, fmt.Errorf("no processor for media type: %s", mediaType)
	}

	res, paths, err := processor(r, savedPath, ResolvePath(entity, picType), uniqueID, entity)
	if err != nil {
		return nil, err
	}

	return &MediaResult{
		Resolutions: res,
		Paths:       paths,
		IDs:         []string{uniqueID},
	}, nil
}

func getUploadedFile(r *http.Request, formKey string) (*multipart.FileHeader, error) {
	if r.MultipartForm == nil {
		r.Body = http.MaxBytesReader(nil, r.Body, 32<<20)
		if err := r.ParseMultipartForm(32 << 20); err != nil { // #nosec G120
			return nil, fmt.Errorf("failed to parse form: %w", err)
		}
	}
	files := r.MultipartForm.File[formKey]
	if len(files) == 0 {
		return nil, nil
	}
	return files[0], nil
}

func SaveUploadedFile(file *multipart.FileHeader, entity EntityType, picType PictureType, userid string) (string, string, string, error) {
	src, err := file.Open()
	if err != nil {
		return "", "", "", fmt.Errorf("cannot open uploaded file: %w", err)
	}
	defer src.Close()

	log.Println("SaveUploadedFile :", picType)
	savedName, ext, err := SaveFileForEntity(src, file, entity, picType, userid)
	if err != nil {
		return "", "", "", fmt.Errorf("file save failed: %w", err)
	}

	savedPath := filepath.Join(ResolvePath(entity, picType), savedName+ext)
	uniqueID := strings.TrimSuffix(savedName, ext)
	return savedPath, uniqueID, ext, nil
}
