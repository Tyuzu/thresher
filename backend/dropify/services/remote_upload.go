package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"naevis/dropify/filemgr"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ProcessRemoteFile downloads and stores a remote file
func (s *FileService) ProcessRemoteFile(
	remoteURL string,
	key string,
	entityType string,
	entityID string,
	userID string,
) ([]Attachment, error) {

	_ = entityID // reserved for future use

	const maxRemoteUploadBytes = 200 << 20 // 200 MB

	// -------------------------
	// Validate URL
	// -------------------------

	parsed, err := url.Parse(remoteURL)
	if err != nil {
		return nil, fmt.Errorf("invalid remote URL")
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported URL scheme")
	}

	// -------------------------
	// SSRF Protection
	// -------------------------

	if err := validateRemoteHost(remoteURL); err != nil {
		return nil, err
	}

	// -------------------------
	// Resolve entity
	// -------------------------

	entity := filemgr.EntityType(strings.ToLower(entityType))

	// -------------------------
	// Resolve picture type
	// -------------------------

	picType := normalizePictureKey(key)

	if _, ok := filemgr.AllowedExtensions[picType]; !ok {
		return nil, fmt.Errorf("invalid picture key")
	}

	// -------------------------
	// Download file
	// -------------------------

	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > 10 {
				return fmt.Errorf("too many redirects")
			}

			if err := validateRemoteHost(req.URL.String()); err != nil {
				return err
			}

			return nil
		},
	}

	resp, err := client.Get(remoteURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download remote file")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remote server returned %d", resp.StatusCode)
	}

	contentType := strings.ToLower(
		strings.TrimSpace(
			strings.Split(resp.Header.Get("Content-Type"), ";")[0],
		),
	)

	// -------------------------
	// Validate MIME type
	// -------------------------

	allowedMIMEs, ok := filemgr.AllowedMIMEs[picType]
	if !ok {
		return nil, fmt.Errorf("unsupported picture type")
	}

	validMIME := false
	for _, mime := range allowedMIMEs {
		if strings.EqualFold(mime, contentType) {
			validMIME = true
			break
		}
	}

	if !validMIME {
		return nil, fmt.Errorf("invalid MIME type %q for %q", contentType, picType)
	}

	// -------------------------
	// Filename
	// -------------------------

	filename := filepath.Base(parsed.Path)
	if filename == "." || filename == "/" || filename == "" {
		filename = "remote-file"
	}

	if filepath.Ext(filename) == "" {
		filename += mimeToExtension(contentType)
	}

	// -------------------------
	// Temp file
	// -------------------------

	tmpFile, err := os.CreateTemp("", "remote-upload-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file")
	}
	defer os.Remove(tmpFile.Name())

	if resp.ContentLength > maxRemoteUploadBytes {
		tmpFile.Close()
		return nil, filemgr.ErrFileTooLarge
	}

	limitedReader := io.LimitReader(resp.Body, maxRemoteUploadBytes+1)

	written, err := io.Copy(tmpFile, limitedReader)
	if err != nil {
		tmpFile.Close()
		return nil, fmt.Errorf("failed to save remote file")
	}

	if written > maxRemoteUploadBytes {
		tmpFile.Close()
		return nil, filemgr.ErrFileTooLarge
	}

	if err := tmpFile.Close(); err != nil {
		return nil, err
	}

	// -------------------------
	// Reopen temp file
	// -------------------------

	file, err := os.Open(tmpFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to reopen temp file")
	}
	defer file.Close()

	// -------------------------
	// Create multipart header
	// -------------------------

	header := &multipart.FileHeader{
		Filename: filename,
		Header: textproto.MIMEHeader{
			"Content-Type": []string{contentType},
		},
		Size: written,
	}

	// -------------------------
	// Save through existing pipeline
	// -------------------------

	savedName, ext, err := filemgr.SaveFileForEntity(
		file,
		header,
		entity,
		picType,
		userID,
	)
	if err != nil {
		return nil, err
	}

	return []Attachment{
		{
			Filename:  savedName,
			Extension: ext,
			Key:       string(picType),
		},
	}, nil
}
