package filemgr

import (
	"bufio"
	"fmt"
	"html"
	"io"
	log "naevis/utils/logger"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
)

type Subtitle struct {
	Index   int
	Start   string
	End     string
	Content string
}

func createSubtitleFile(uniqueID string) {
	if err := writeVTT(uniqueID, "en", nil); err != nil {
		log.Printf("subtitle creation failed: %v", err)
	}
}

func writeVTT(uniqueID, lang string, subtitles []Subtitle) error {
	if err := validateSubtitles(subtitles); err != nil && len(subtitles) > 0 {
		return fmt.Errorf("invalid subtitles: %w", err)
	}

	dir := filepath.Join("static", "uploads", "subtitles", uniqueID)
	if err := os.MkdirAll(dir, 0o700); err != nil { // #nosec G703
		return fmt.Errorf("mkdir %s: %w", dir, err)
	}

	filePath := filepath.Join(dir, fmt.Sprintf("%s-%s.vtt", uniqueID, lang))
	file, err := os.Create(filePath) // #nosec G703 G304
	if err != nil {
		return fmt.Errorf("create subtitle file: %w", err)
	}
	defer file.Close()

	w := bufio.NewWriter(file)
	defer w.Flush()

	if _, err := w.WriteString("WEBVTT\n\n"); err != nil {
		return fmt.Errorf("write header: %w", err)
	}

	for _, s := range subtitles {
		line := fmt.Sprintf("%d\n%s --> %s\n%s\n\n", s.Index, s.Start, s.End, s.Content)
		if _, err := w.WriteString(line); err != nil {
			return fmt.Errorf("write subtitle: %w", err)
		}
	}
	return nil
}

func validateSubtitles(subs []Subtitle) error {
	if len(subs) == 0 {
		return nil
	}
	for i, s := range subs {
		if s.Index != i+1 {
			return fmt.Errorf("subtitle index out of order at %d (expected %d)", s.Index, i+1)
		}
		start, err := parseTimestamp(s.Start)
		if err != nil {
			return fmt.Errorf("invalid start timestamp at index %d: %w", s.Index, err)
		}
		end, err := parseTimestamp(s.End)
		if err != nil {
			return fmt.Errorf("invalid end timestamp at index %d: %w", s.Index, err)
		}
		if start >= end {
			return fmt.Errorf("start >= end at index %d", s.Index)
		}
		if strings.TrimSpace(s.Content) == "" {
			return fmt.Errorf("empty content at index %d", s.Index)
		}
	}
	return nil
}

func parseTimestamp(ts string) (int, error) {
	parts := strings.Split(ts, ":")
	if len(parts) != 3 {
		return 0, fmt.Errorf("wrong format")
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, err
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, err
	}
	secParts := strings.Split(parts[2], ".")
	if len(secParts) != 2 {
		return 0, fmt.Errorf("invalid seconds part")
	}
	s, err := strconv.Atoi(secParts[0])
	if err != nil {
		return 0, err
	}
	ms, err := strconv.Atoi(secParts[1])
	if err != nil {
		return 0, err
	}
	if m < 0 || m >= 60 || s < 0 || s >= 60 || ms < 0 || ms >= 1000 {
		return 0, fmt.Errorf("invalid ranges")
	}
	total := (((h*60)+m)*60+s)*1000 + ms
	return total, nil
}

func SaveUploadedVTT(w http.ResponseWriter, r *http.Request, uniqueID, lang string) (string, error) {
	r.Body = http.MaxBytesReader(nil, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil { // #nosec G120
		http.Error(w, "could not parse multipart form", http.StatusBadRequest)
		return "", err
	}

	file, header, err := r.FormFile("subtitle")
	if err != nil {
		http.Error(w, "subtitle file is required", http.StatusBadRequest)
		return "", err
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".vtt") {
		http.Error(w, "only .vtt files are supported", http.StatusBadRequest)
		return "", fmt.Errorf("invalid file type: %s", header.Filename)
	}

	tempFile, err := os.CreateTemp("", "*.vtt")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	tempPath := tempFile.Name()
	defer func() {
		_ = tempFile.Close()
		_ = os.Remove(tempPath)
	}()

	if _, err := io.Copy(tempFile, file); err != nil {
		return "", fmt.Errorf("save temp vtt: %w", err)
	}
	if err := tempFile.Close(); err != nil {
		return "", fmt.Errorf("close temp vtt: %w", err)
	}

	subs, err := parseVTT(tempPath)
	if err != nil {
		return "", fmt.Errorf("parse vtt failed: %w", err)
	}

	if err := writeVTT(uniqueID, lang, subs); err != nil {
		return "", fmt.Errorf("normalize vtt failed: %w", err)
	}

	finalPath := filepath.Join("static", "uploads", "subtitles", uniqueID, fmt.Sprintf("%s-%s.vtt", uniqueID, lang))
	return finalPath, nil
}

func parseVTT(filePath string) ([]Subtitle, error) {
	data, err := os.ReadFile(filePath) // #nosec G304
	if err != nil {
		return nil, fmt.Errorf("read vtt: %w", err)
	}

	lines := strings.Split(string(data), "\n")
	var subs []Subtitle
	var current Subtitle
	state := 0

	flush := func() {
		if current.Index != 0 {
			subs = append(subs, current)
			current = Subtitle{}
		}
	}

	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" {
			flush()
			state = 0
			continue
		}

		switch state {
		case 0:
			if line == "WEBVTT" || strings.HasPrefix(line, "NOTE") {
				continue
			}
			idx, err := strconv.Atoi(line)
			if err != nil {
				continue
			}
			current.Index = idx
			state = 1
		case 1:
			parts := strings.Split(line, " --> ")
			if len(parts) != 2 {
				return nil, fmt.Errorf("invalid timing line: %s", line)
			}
			current.Start = parts[0]
			current.End = parts[1]
			state = 2
		case 2:
			if current.Content == "" {
				current.Content = line
			} else {
				current.Content += "\n" + line
			}
		}
	}

	flush()
	if err := validateSubtitles(subs); err != nil {
		return nil, err
	}
	return subs, nil
}

func UploadSubtitle(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	uniqueID := strings.TrimSpace(ps.ByName("id"))
	if uniqueID == "" {
		uniqueID = strings.TrimSpace(ps.ByName("uniqueID"))
	}
	if uniqueID == "" {
		uniqueID = strings.TrimSpace(r.FormValue("id"))
	}
	if uniqueID == "" {
		uniqueID = strings.TrimSpace(r.FormValue("uniqueID"))
	}
	if uniqueID == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}

	lang := strings.TrimSpace(ps.ByName("lang"))
	if lang == "" {
		lang = strings.TrimSpace(r.FormValue("lang"))
	}
	if lang == "" {
		lang = "en"
	}

	path, err := SaveUploadedVTT(w, r, uniqueID, lang)
	if err != nil {
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusCreated)
	_, _ = w.Write([]byte(html.EscapeString(path)))
}
