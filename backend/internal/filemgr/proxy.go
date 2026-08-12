package filemgr

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/disintegration/imaging"
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

// ProxyHandler fetches external images, resizes/caches them safely, and serves content.
func ProxyHandler(w http.ResponseWriter, r *http.Request) {
	// Extract raw target URL from either route path (/static/proxy/https://...) or query parameter (?url=https://...)
	rawTarget := strings.TrimPrefix(r.URL.Path, "/static/proxy")
	rawTarget = strings.TrimPrefix(rawTarget, "/")

	if rawTarget == "" {
		rawTarget = r.URL.Query().Get("url")
	}

	target, err := normalizeTarget(rawTarget)
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

	_ = os.MkdirAll(CacheDir, 0o750)

	cacheKey := target + "|" + r.URL.RawQuery
	cachePath := filepath.Join(CacheDir, hashURL(cacheKey))

	// Return cached version if fresh
	if fi, err := os.Stat(cachePath); err == nil && time.Since(fi.ModTime()) < CacheMaxAge {
		serveCacheFile(w, r, cachePath)
		return
	}

	wParam, _ := strconv.Atoi(r.URL.Query().Get("w"))
	hParam, _ := strconv.Atoi(r.URL.Query().Get("h"))
	qParam, _ := strconv.Atoi(r.URL.Query().Get("q"))
	if qParam <= 0 || qParam > 100 {
		qParam = 80
	}

	format := strings.ToLower(r.URL.Query().Get("format"))
	if format == "" || (format != "jpeg" && format != "jpg") {
		format = "jpeg"
	}

	resp, err := fetchWithContext(r.Context(), target)
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
		serveCacheFile(w, r, cachePath)
		return
	}

	// Read initial header bytes to probe image dimensions safely
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

	fullReader := io.MultiReader(bytes.NewReader(head), resp.Body)
	full, err := io.ReadAll(io.LimitReader(fullReader, MaxImageBytes))
	if err != nil {
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

	serveCacheFile(w, r, cachePath)
}

// serveCacheFile directly streams the file on disk to the client using http.ServeContent,
// avoiding path-resolution issues present in http.ServeFile when routing through handlers.
func serveCacheFile(w http.ResponseWriter, r *http.Request, cachePath string) {
	file, err := os.Open(cachePath)
	if err != nil {
		http.Error(w, "file read error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	fi, err := file.Stat()
	if err != nil {
		http.Error(w, "file stat error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeContent(w, r, filepath.Base(cachePath), fi.ModTime(), file)
}

func hashURL(input string) string {
	h := sha256.Sum256([]byte(input))
	return hex.EncodeToString(h[:])
}

func normalizeTarget(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("empty url")
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

	if u.Scheme != "http" && u.Scheme != "https" {
		return "", errors.New("unsupported scheme")
	}

	if u.Host == "" {
		return "", errors.New("missing host")
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

	// Resolve IP addresses and prevent targeting internal or loopback addresses
	ips, err := net.LookupIP(host)
	if err != nil || len(ips) == 0 {
		return false
	}

	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return false
		}
	}
	return true
}

func fetchWithContext(ctx context.Context, target string) (*http.Response, error) {
	select {
	case fetchSem <- struct{}{}:
		defer func() { <-fetchSem }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}

	return httpClient.Do(req)
}

func streamFallback(w http.ResponseWriter, r *http.Request, cachePath, contentType string, head []byte, body io.Reader) {
	_ = contentType
	if err := streamToCache(io.MultiReader(bytes.NewReader(head), body), cachePath); err != nil {
		http.Error(w, "stream fail", http.StatusBadGateway)
		return
	}
	serveCacheFile(w, r, cachePath)
}

func streamToCache(src io.Reader, cachePath string) error {
	return saveAtomically(cachePath, func(f *os.File) error {
		_, err := io.Copy(f, src)
		return err
	})
}

func saveAtomically(path string, writeFn func(*os.File) error) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o750); err != nil {
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
	_ = format
	select {
	case encSem <- struct{}{}:
		defer func() { <-encSem }()
	case <-time.After(5 * time.Second):
		return fmt.Errorf("encoding semaphore timeout")
	}

	return saveAtomically(cachePath, func(f *os.File) error {
		return jpeg.Encode(f, img, &jpeg.Options{Quality: quality})
	})
}
