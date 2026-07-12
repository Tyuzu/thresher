package filemgr

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (s *FileService) ProcessRemoteFile(remoteURL string, key string, entityType string, entityID string, userID string) ([]Attachment, error) {
	_ = entityID
	const maxRemoteUploadBytes = 200 << 20

	parsed, err := url.Parse(remoteURL)
	if err != nil {
		return nil, fmt.Errorf("invalid remote URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported URL scheme")
	}
	if err := validateRemoteHost(remoteURL); err != nil {
		return nil, err
	}

	entity := EntityType(strings.ToLower(strings.TrimSpace(entityType)))
	picType := normalizePictureKey(key)
	if _, ok := AllowedExtensions[picType]; !ok {
		return nil, fmt.Errorf("invalid picture key")
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > 10 {
				return fmt.Errorf("too many redirects")
			}
			return validateRemoteHost(req.URL.String())
		},
	}

	resp, err := client.Get(remoteURL) // #nosec G704
	if err != nil {
		return nil, fmt.Errorf("failed to download remote file")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remote server returned %d", resp.StatusCode)
	}

	contentType := strings.ToLower(strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0]))
	allowedMIMEs, ok := AllowedMIMEs[picType]
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

	filename := filepath.Base(parsed.Path)
	if filename == "." || filename == "/" || filename == "" {
		filename = "remote-file"
	}
	if filepath.Ext(filename) == "" {
		filename += mimeToExtension(contentType)
	}

	tmpFile, err := os.CreateTemp("", "remote-upload-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file")
	}
	defer os.Remove(tmpFile.Name())

	limitedReader := io.LimitReader(resp.Body, maxRemoteUploadBytes+1)
	written, err := io.Copy(tmpFile, limitedReader)
	if err != nil {
		_ = tmpFile.Close()
		return nil, fmt.Errorf("failed to save remote file")
	}
	if written > maxRemoteUploadBytes {
		_ = tmpFile.Close()
		return nil, ErrFileTooLarge
	}
	if err := tmpFile.Close(); err != nil {
		return nil, err
	}

	file, err := os.Open(tmpFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to reopen temp file")
	}
	defer file.Close()

	header := &multipart.FileHeader{
		Filename: filename,
		Header: textproto.MIMEHeader{
			"Content-Type": []string{contentType},
		},
		Size: written,
	}

	savedName, ext, err := SaveFileForEntity(file, header, entity, picType, userID)
	if err != nil {
		return nil, err
	}

	return []Attachment{{Filename: savedName, Extension: ext, Key: string(picType)}}, nil
}
