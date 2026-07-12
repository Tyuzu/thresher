package filemgr

import (
	"bufio"
	"fmt"
	"io"
	"mime/multipart"
	"naevis/utils"
	log "naevis/utils/logger"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	defaultThumbWidth = 500
	maxUploadSize     = 200 << 20 // 200 MB
	defaultQuality    = 85
)

func SaveFileForEntity(file multipart.File, header *multipart.FileHeader, entity EntityType, picType PictureType, userid string) (string, string, error) {
	return saveFileAndProcess(file, header, entity, picType, defaultThumbWidth, userid)
}

func saveFileAndProcess(file multipart.File, header *multipart.FileHeader, entity EntityType, picType PictureType, thumbWidth int, userid string) (string, string, error) {
	destDir := ResolvePath(entity, picType)
	log.Println("destDir, picType, entity, maxUploadSize, userid", destDir, picType, entity, maxUploadSize, userid) // #nosec G706
	filename, ext, fullPath, err := writeValidatedFile(file, header, destDir, picType, entity, maxUploadSize, userid)
	if err != nil {
		return "", "", err
	}

	finalPath := fullPath
	finalExt := ext

	switch {
	case isImageType(picType):
		finalPath, finalExt, err = processImage(fullPath, entity, picType, thumbWidth, filename, ext)
		if err != nil {
			return "", "", err
		}
	case picType == PicVideo || isVideoExt(ext):
		go func(vpath string, ent EntityType, fname string) {
			thumb, err := generateVideoPoster(vpath, ent, fname)
			if err != nil {
				if LogFunc != nil {
					LogFunc(fmt.Sprintf("warning: video poster generation failed for %s: %v", fname, err), 0, "")
				}
				return
			}
			if LogFunc != nil {
				LogFunc(thumb, 0, "image/jpeg")
			}
		}(fullPath, entity, filename+ext)
	}

	finalBase := strings.TrimSuffix(filepath.Base(finalPath), filepath.Ext(finalPath))
	if finalBase != filename {
		filename = finalBase
	}
	return filename, finalExt, nil
}

func writeValidatedFile(reader io.Reader, header *multipart.FileHeader, destDir string, picType PictureType, entityType EntityType, maxSize int64, userid string) (string, string, string, error) {
	br := bufio.NewReader(reader)
	headerBytes, err := br.Peek(512)
	if err != nil && err != bufio.ErrBufferFull && err != io.EOF {
		return "", "", "", fmt.Errorf("read header: %w", err)
	}

	mimeType := strings.ToLower(http.DetectContentType(headerBytes))
	if mimeType == "application/octet-stream" && header != nil {
		if formMime := strings.ToLower(strings.TrimSpace(header.Header.Get("Content-Type"))); formMime != "" {
			mimeType = formMime
		}
	}

	if !isMIMEAllowed(mimeType, picType) {
		return "", "", "", fmt.Errorf("%w: %s for %s", ErrInvalidMIME, mimeType, picType)
	}

	safeExt := mimeToExtension(mimeType)
	if safeExt == "" {
		return "", "", "", fmt.Errorf("unsupported mime type: %s", mimeType)
	}

	if err := os.MkdirAll(destDir, 0o750); err != nil {
		return "", "", "", fmt.Errorf("mkdir %s: %w", destDir, err)
	}

	originalName := utils.GetUUID()

	//	originalName := ""
	//	if header != nil {
	//		originalName = header.Filename
	//	}
	filenameOnly, finalExt := getSafeFilename(originalName, safeExt, userid, entityType, picType, func(s string) string { return s })

	fullPath := filepath.Join(destDir, filenameOnly+finalExt)
	out, err := os.OpenFile(fullPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600) // #nosec G703 G304
	if err != nil {
		return "", "", "", fmt.Errorf("create %s: %w", fullPath, err)
	}
	defer out.Close()

	if _, err := io.Copy(out, io.LimitReader(br, maxSize+1)); err != nil {
		_ = os.Remove(fullPath) // #nosec G703
		return "", "", "", fmt.Errorf("write body: %w", err)
	}

	stat, err := out.Stat()
	if err == nil && stat.Size() > maxSize {
		_ = os.Remove(fullPath) // #nosec G703
		return "", "", "", ErrFileTooLarge
	}

	if err := out.Sync(); err != nil {
		_ = os.Remove(fullPath) // #nosec G703
		return "", "", "", fmt.Errorf("sync %s: %w", fullPath, err)
	}

	if err := ScanForViruses(fullPath); err != nil {
		_ = os.Remove(fullPath) // #nosec G703
		return "", "", "", fmt.Errorf("virus scan failed: %w", err)
	}

	if LogFunc != nil {
		LogFunc(filenameOnly+finalExt, stat.Size(), mimeType)
	}
	log.Printf("saved file: %s%s (%s)", filenameOnly, finalExt, mimeType) // #nosec G706
	return filenameOnly, finalExt, fullPath, nil
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
