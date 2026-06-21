package filemgr

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/julienschmidt/httprouter"
)

const (
	CacheDir          = "./static/mediacache/media"
	CacheMaxAge       = 72 * time.Hour
	ClientTimeout     = 12 * time.Second
	MaxPixelsAllowed  = 4096 * 4096
	StreamThresholdPx = 8 * 1024 * 1024
	MaxImageBytes     = 200 * 1024 * 1024
	ProbeLimit        = 64 * 1024
	MaxFetchers       = 8
	MaxEncoders       = 6
)

var (
	httpClient      = &http.Client{Timeout: ClientTimeout}
	DomainBlocklist = map[string]bool{}
	DomainAllowlist = map[string]bool{}
	fetchSem        = make(chan struct{}, MaxFetchers)
	encSem          = make(chan struct{}, MaxEncoders)
)

func ProxyHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	target, err := normalizeTarget(ps.ByName("url"))
	if err != nil {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	u, err := url.Parse(target)
	if err != nil {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	if !isAllowedHost(u.Hostname()) {
		http.Error(w, "blocked host", http.StatusForbidden)
		return
	}

	_ = os.MkdirAll(CacheDir, 0o755)

	cacheKey := target + "|" + r.URL.RawQuery
	cachePath := filepath.Join(CacheDir, hashURL(cacheKey))

	if fi, err := os.Stat(cachePath); err == nil && time.Since(fi.ModTime()) < CacheMaxAge {
		http.ServeFile(w, r, cachePath)
		return
	}

	wParam, _ := strconv.Atoi(r.URL.Query().Get("w"))
	hParam, _ := strconv.Atoi(r.URL.Query().Get("h"))
	qParam, _ := strconv.Atoi(r.URL.Query().Get("q"))
	if qParam <= 0 {
		qParam = 80
	}
	format := strings.ToLower(r.URL.Query().Get("format"))
	if format == "" {
		format = "jpeg"
	}
	if format != "jpeg" && format != "jpg" {
		format = "jpeg"
	}

	resp, err := fetch(target)
	if err != nil {
		http.Error(w, "fetch failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if !strings.HasPrefix(contentType, "image/") {
		if err := streamToCache(resp.Body, cachePath); err != nil {
			http.Error(w, "stream fail", http.StatusBadGateway)
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=86400")
		http.ServeFile(w, r, cachePath)
		return
	}

	head, err := io.ReadAll(io.LimitReader(resp.Body, ProbeLimit))
	if err != nil && err != io.EOF {
		http.Error(w, "probe fail", http.StatusBadGateway)
		return
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(head))
	if err != nil {
		streamFallback(w, r, cachePath, contentType, head, resp.Body)
		return
	}

	totalPx := int64(cfg.Width) * int64(cfg.Height)
	if totalPx > StreamThresholdPx || totalPx > MaxPixelsAllowed {
		streamFallback(w, r, cachePath, contentType, head, resp.Body)
		return
	}

	full, err := io.ReadAll(io.MultiReader(bytes.NewReader(head), resp.Body))
	if err != nil || int64(len(full)) > MaxImageBytes {
		streamFallback(w, r, cachePath, contentType, head, resp.Body)
		return
	}

	img, _, err := image.Decode(bytes.NewReader(full))
	if err != nil {
		streamFallback(w, r, cachePath, contentType, head, resp.Body)
		return
	}

	if wParam > 0 || hParam > 0 {
		switch {
		case wParam > 0 && hParam > 0:
			img = imaging.Fit(img, wParam, hParam, imaging.Lanczos)
		case wParam > 0:
			img = imaging.Resize(img, wParam, 0, imaging.Lanczos)
		case hParam > 0:
			img = imaging.Resize(img, 0, hParam, imaging.Lanczos)
		}
	}

	if err := encode(img, cachePath, format, qParam); err != nil {
		http.Error(w, "encode fail", http.StatusBadGateway)
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeFile(w, r, cachePath)
}

func normalizeTarget(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("empty url")
	}

	if u, err := url.PathUnescape(raw); err == nil {
		raw = u
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}

	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	if u.Scheme == "" {
		u.Scheme = "https"
	}
	return u.String(), nil
}

func isAllowedHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return false
	}
	if DomainBlocklist[host] {
		return false
	}
	if len(DomainAllowlist) > 0 && !DomainAllowlist[host] {
		return false
	}
	if err := validateRemoteHost("https://" + host); err != nil {
		return false
	}
	return true
}

func fetch(target string) (*http.Response, error) {
	fetchSem <- struct{}{}
	defer func() { <-fetchSem }()
	return httpClient.Get(target)
}

func streamFallback(w http.ResponseWriter, r *http.Request, cachePath, contentType string, head []byte, body io.Reader) {
	_ = contentType
	if err := streamToCache(io.MultiReader(bytes.NewReader(head), body), cachePath); err != nil {
		http.Error(w, "stream fail", http.StatusBadGateway)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeFile(w, r, cachePath)
}

func streamToCache(src io.Reader, cachePath string) error {
	return saveAtomically(cachePath, func(f *os.File) error {
		_, err := io.Copy(f, src)
		return err
	})
}

func saveAtomically(path string, writeFn func(*os.File) error) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, ".cache-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	cleanup := true
	defer func() {
		_ = tmp.Close()
		if cleanup {
			_ = os.Remove(tmpName)
		}
	}()

	if err := writeFn(tmp); err != nil {
		return err
	}
	if err := tmp.Sync(); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmpName, path); err != nil {
		return err
	}
	cleanup = false
	return nil
}

func encode(img image.Image, cachePath, format string, quality int) error {
	encSem <- struct{}{}
	defer func() { <-encSem }()

	return saveAtomically(cachePath, func(f *os.File) error {
		switch format {
		case "jpeg", "jpg":
			return jpeg.Encode(f, img, &jpeg.Options{Quality: quality})
		default:
			return jpeg.Encode(f, img, &jpeg.Options{Quality: quality})
		}
	})
}
