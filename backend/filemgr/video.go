package filemgr

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	ffprobeTimeout   = 30 * time.Second
	transcodeTimeout = 10 * time.Minute
	posterTimeout    = 45 * time.Second
	audioTimeout     = 3 * time.Minute
)

type Runner interface {
	Run(timeout time.Duration, name string, args ...string) (stdout string, stderr string, err error)
}

type realRunner struct{}

func (realRunner) Run(timeout time.Duration, name string, args ...string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, name, args...)
	var out, errb bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errb

	err := cmd.Run()
	if ctx.Err() == context.DeadlineExceeded {
		return out.String(), errb.String(), fmt.Errorf("%s timed out after %s", name, timeout)
	}
	return out.String(), errb.String(), err
}

var cmdRunner Runner = realRunner{}

func getVideoDimensions(videoPath string) (int, int, error) {
	args := []string{
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=p=0",
		videoPath,
	}
	stdout, stderr, err := cmdRunner.Run(ffprobeTimeout, "ffprobe", args...)
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe getVideoDimensions(%s) failed: %w (stderr=%s)", videoPath, err, stderr)
	}

	parts := strings.Split(strings.TrimSpace(stdout), ",")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("ffprobe getVideoDimensions unexpected output for %s: %q", videoPath, stdout)
	}

	width, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe parse width for %s: %w", videoPath, err)
	}
	height, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil {
		return 0, 0, fmt.Errorf("ffprobe parse height for %s: %w", videoPath, err)
	}
	return width, height, nil
}

func processVideoResolution(inputPath, outputPath string, targetHeight int) error {
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return fmt.Errorf("create output dir for %s: %w", outputPath, err)
	}

	scaleFilter := fmt.Sprintf("scale=-2:%d", targetHeight)
	args := []string{
		"-y",
		"-i", inputPath,
		"-vf", scaleFilter,
		"-c:v", "libx264",
		"-crf", "23",
		"-preset", "veryfast",
		"-tune", "zerolatency",
		"-pix_fmt", "yuv420p",
		"-max_muxing_queue_size", "9999",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart",
		outputPath,
	}

	stdout, stderr, err := cmdRunner.Run(transcodeTimeout, "ffmpeg", args...)
	if err != nil {
		return fmt.Errorf("ffmpeg transcode %s -> %s (%s) failed: %w (stdout=%s, stderr=%s)", inputPath, outputPath, scaleFilter, err, stdout, stderr)
	}
	return nil
}

func CreatePoster(videoPath, posterPath string) error {
	if err := os.MkdirAll(filepath.Dir(posterPath), 0o755); err != nil {
		return fmt.Errorf("failed to create poster directory for %s: %w", posterPath, err)
	}

	duration, err := getVideoDuration(videoPath)
	if err != nil || duration <= 0 {
		log.Printf("CreatePoster duration unavailable for %s: %v", videoPath, err)
		duration = 3.0
	}

	t := duration * 0.25
	if t < 1.0 {
		t = 1.0
	}
	if t > duration-0.5 {
		t = math.Max(0.0, duration-0.5)
	}
	timestamp := formatTimestamp(t)

	args := []string{
		"-y",
		"-ss", timestamp,
		"-i", videoPath,
		"-vframes", "1",
		"-q:v", "2",
		"-vf", "scale=w=iw*min(1280/iw\\,720/ih):h=ih*min(1280/iw\\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\\,720/ih))/2:(720-ih*min(1280/iw\\,720/ih))/2:black",
		posterPath,
	}

	stdout, stderr, err := cmdRunner.Run(posterTimeout, "ffmpeg", args...)
	if err != nil {
		return fmt.Errorf("poster creation failed for %s at %s: %w (stdout=%s, stderr=%s)", videoPath, timestamp, err, stdout, stderr)
	}
	return nil
}

func getVideoDuration(path string) (float64, error) {
	args := []string{
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "json",
		path,
	}
	stdout, stderr, err := cmdRunner.Run(ffprobeTimeout, "ffprobe", args...)
	if err != nil {
		return 0, fmt.Errorf("ffprobe getVideoDuration(%s) failed: %w (stderr=%s)", path, err, stderr)
	}

	var result struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	if err := json.Unmarshal([]byte(stdout), &result); err != nil {
		return 0, fmt.Errorf("ffprobe unmarshal duration for %s: %w (stdout=%s)", path, err, stdout)
	}
	if strings.TrimSpace(result.Format.Duration) == "" {
		return 0, fmt.Errorf("ffprobe duration not found for %s (stdout=%s)", path, stdout)
	}

	dur, err := strconv.ParseFloat(result.Format.Duration, 64)
	if err != nil {
		return 0, fmt.Errorf("parse duration for %s: %w (value=%s)", path, err, result.Format.Duration)
	}
	return dur, nil
}

func formatTimestamp(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}
	totalMs := int(seconds * 1000.0)
	h := totalMs / 3600000
	m := (totalMs % 3600000) / 60000
	s := (totalMs % 60000) / 1000
	ms := totalMs % 1000
	return fmt.Sprintf("%02d:%02d:%02d.%03d", h, m, s, ms)
}

func ExtractVideoDuration(videoPath string) float64 {
	res, err := getVideoDuration(videoPath)
	if err != nil {
		return 0
	}
	return res
}

func processAudioResolutions(originalFilePath, uploadDir, uniqueID string) ([]int, string) {
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		fmt.Printf("audio: failed to create output dir %s: %v\n", uploadDir, err)
		return []int{}, originalFilePath
	}
	outputPath := filepath.Join(uploadDir, uniqueID+".mp3")

	inputBitrate := probeAudioBitrate(originalFilePath)

	targetKbps := 128
	if inputBitrate > 0 {
		inKbps := inputBitrate / 1000
		if inKbps < targetKbps {
			targetKbps = inKbps
		}
		if targetKbps <= 0 {
			targetKbps = 128
		}
	}

	args := []string{
		"-y",
		"-i", originalFilePath,
		"-vn",
		"-c:a", "libmp3lame",
		"-b:a", fmt.Sprintf("%dk", targetKbps),
		"-filter:a", "loudnorm",
		outputPath,
	}

	stdout, stderr, err := cmdRunner.Run(audioTimeout, "ffmpeg", args...)
	if err != nil {
		fmt.Printf("audio processing failed for %s -> %s: %v\nstdout: %s\nstderr: %s\n", originalFilePath, outputPath, err, stdout, stderr)
		return []int{}, originalFilePath
	}

	return []int{targetKbps}, outputPath
}

func probeAudioBitrate(path string) int {
	args := []string{
		"-v", "error",
		"-select_streams", "a:0",
		"-show_entries", "stream=bit_rate",
		"-of", "json",
		path,
	}
	stdout, _, err := cmdRunner.Run(ffprobeTimeout, "ffprobe", args...)
	if err != nil {
		return 0
	}

	var result struct {
		Streams []struct {
			BitRate json.Number `json:"bit_rate"`
		} `json:"streams"`
	}
	if err := json.Unmarshal([]byte(stdout), &result); err != nil || len(result.Streams) == 0 {
		return 0
	}

	brStr := strings.TrimSpace(string(result.Streams[0].BitRate))
	if brStr == "" {
		return 0
	}
	br, err := strconv.Atoi(brStr)
	if err != nil || br <= 0 {
		return 0
	}
	return br
}

func ProcessVideo(r *http.Request, savedPath, uploadDir, uniqueID string, entitytype EntityType) ([]int, []string, error) {
	width, height, err := getVideoDimensions(savedPath)
	if err != nil {
		_ = os.Remove(savedPath)
		return nil, nil, fmt.Errorf("failed to get video dimensions: %w", err)
	}

	resolutions, outputPaths := processVideoResolutionsParallel(savedPath, uploadDir, uniqueID, width, height, 3)
	if len(outputPaths) == 0 {
		_ = os.Remove(savedPath)
		return nil, nil, fmt.Errorf("video transcoding failed")
	}

	posterDir := ResolvePath(entitytype, PicPoster)
	if err := os.MkdirAll(posterDir, 0o755); err != nil {
		cleanupPaths(outputPaths)
		_ = os.Remove(savedPath)
		return nil, nil, fmt.Errorf("failed to create poster directory: %w", err)
	}
	thumbPath := filepath.Join(posterDir, uniqueID+".jpg")

	thumbnailFile, _, thumbErr := r.FormFile("thumbnail")
	if thumbErr == nil {
		defer thumbnailFile.Close()

		tmpThumb, err := os.CreateTemp("", uniqueID+"_thumb-*")
		if err != nil {
			cleanupPaths(outputPaths)
			_ = os.Remove(savedPath)
			return nil, nil, fmt.Errorf("failed to create temp thumbnail: %w", err)
		}
		tmpThumbPath := tmpThumb.Name()
		if _, err := io.Copy(tmpThumb, thumbnailFile); err != nil {
			tmpThumb.Close()
			_ = os.Remove(tmpThumbPath)
			cleanupPaths(outputPaths)
			_ = os.Remove(savedPath)
			return nil, nil, fmt.Errorf("failed to write temp thumbnail: %w", err)
		}
		_ = tmpThumb.Close()

		args := []string{
			"-y",
			"-i", tmpThumbPath,
			"-vf", "scale=w=iw*min(1280/iw\\,720/ih):h=ih*min(1280/iw\\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\\,720/ih))/2:(720-ih*min(1280/iw\\,720/ih))/2:black",
			thumbPath,
		}
		stdout, stderr, err := cmdRunner.Run(time.Minute, "ffmpeg", args...)
		_ = os.Remove(tmpThumbPath)
		if err != nil {
			cleanupPaths(outputPaths)
			_ = os.Remove(savedPath)
			return nil, nil, fmt.Errorf("failed to process thumbnail: %w (stdout=%s, stderr=%s)", err, stdout, stderr)
		}
	} else {
		if err := CreatePoster(savedPath, thumbPath); err != nil {
			cleanupPaths(outputPaths)
			_ = os.Remove(savedPath)
			return nil, nil, fmt.Errorf("poster creation failed: %w", err)
		}
	}

	go createSubtitleFile(uniqueID)
	return resolutions, outputPaths, nil
}

type videoTask struct {
	Height     int
	OutputPath string
}

func processVideoResolutionsParallel(originalFilePath, uploadDir, uniqueID string, origWidth, origHeight int, maxParallel int) ([]int, []string) {
	_ = origWidth
	if maxParallel <= 0 {
		maxParallel = 2
	}

	ladder := []struct {
		Height int
	}{
		{4320}, {2160}, {1440}, {1080}, {720}, {480}, {360}, {240}, {144},
	}

	var tasks []videoTask
	for _, r := range ladder {
		if r.Height > origHeight {
			continue
		}
		tasks = append(tasks, videoTask{
			Height:     r.Height,
			OutputPath: generateFilePath(uploadDir, uniqueID+"-"+strconv.Itoa(r.Height), "mp4"),
		})
	}
	if len(tasks) == 0 {
		return nil, nil
	}

	workers := maxParallel
	if workers > len(tasks) {
		workers = len(tasks)
	}

	results := make(chan struct {
		height int
		path   string
		ok     bool
	}, len(tasks))

	jobs := make(chan videoTask)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range jobs {
				if err := processVideoResolution(originalFilePath, t.OutputPath, t.Height); err != nil {
					fmt.Printf("Skipping %d due to error: %v\n", t.Height, err)
					results <- struct {
						height int
						path   string
						ok     bool
					}{ok: false}
					continue
				}
				results <- struct {
					height int
					path   string
					ok     bool
				}{height: t.Height, path: "/" + filepath.ToSlash(t.OutputPath), ok: true}
			}
		}()
	}

	go func() {
		for _, t := range tasks {
			jobs <- t
		}
		close(jobs)
		wg.Wait()
		close(results)
	}()

	type pair struct {
		h int
		p string
	}
	var pairs []pair
	for res := range results {
		if res.ok {
			pairs = append(pairs, pair{h: res.height, p: res.path})
		}
	}

	if len(pairs) == 0 {
		return nil, nil
	}

	sort.Slice(pairs, func(i, j int) bool { return pairs[i].h > pairs[j].h })

	heights := make([]int, 0, len(pairs))
	outputs := make([]string, 0, len(pairs))
	for _, pr := range pairs {
		heights = append(heights, pr.h)
		outputs = append(outputs, pr.p)
	}
	return heights, outputs
}

func cleanupPaths(paths []string) {
	for _, p := range paths {
		if p == "" {
			continue
		}
		_ = os.Remove(strings.TrimPrefix(filepath.FromSlash(p), string(filepath.Separator)))
	}
}

func isVideoExt(ext string) bool {
	switch strings.ToLower(ext) {
	case ".mp4", ".mov", ".mkv", ".webm", ".avi", ".flv", ".m4v":
		return true
	default:
		return false
	}
}
