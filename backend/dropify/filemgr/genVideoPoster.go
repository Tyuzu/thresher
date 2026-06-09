package filemgr

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func generateVideoPoster(
	videoPath string,
	entity EntityType,
	baseFilename string,
) (string, error) {

	thumbName :=
		strings.TrimSuffix(
			baseFilename,
			filepath.Ext(baseFilename),
		) + ".jpg"

	thumbDir := ResolvePath(entity, PicThumb)

	thumbPath :=
		filepath.Join(
			thumbDir,
			thumbName,
		)

	if err := os.MkdirAll(
		thumbDir,
		0o755,
	); err != nil {

		return "", fmt.Errorf(
			"mkdir %s: %w",
			thumbDir,
			err,
		)
	}

	ts := 0.5

	probeCtx, probeCancel :=
		context.WithTimeout(
			context.Background(),
			30*time.Second,
		)

	defer probeCancel()

	if out, err := exec.CommandContext(
		probeCtx,
		"ffprobe",
		"-v",
		"error",
		"-show_entries",
		"format=duration",
		"-of",
		"default=noprint_wrappers=1:nokey=1",
		videoPath,
	).Output(); err == nil {

		if d, err := strconv.ParseFloat(
			strings.TrimSpace(string(out)),
			64,
		); err == nil && d > 0 {

			if d >= 0.5 {
				ts = d / 2
			} else {
				ts = 0
			}
		}
	}

	ss := fmt.Sprintf("%.3f", ts)

	ffmpegCtx, ffmpegCancel :=
		context.WithTimeout(
			context.Background(),
			2*time.Minute,
		)

	defer ffmpegCancel()

	cmd := exec.CommandContext(
		ffmpegCtx,
		"ffmpeg",
		"-y",
		"-i",
		videoPath,
		"-ss",
		ss,
		"-vframes",
		"1",
		thumbPath,
	)

	if err := cmd.Run(); err != nil {

		fallbackCtx, fallbackCancel :=
			context.WithTimeout(
				context.Background(),
				2*time.Minute,
			)

		defer fallbackCancel()

		fallback := exec.CommandContext(
			fallbackCtx,
			"ffmpeg",
			"-y",
			"-i",
			videoPath,
			"-ss",
			"0",
			"-vframes",
			"1",
			thumbPath,
		)

		if ferr := fallback.Run(); ferr != nil {

			return "",
				fmt.Errorf(
					"ffmpeg poster generation failed (primary: %v, fallback: %v)",
					err,
					ferr,
				)
		}
	}

	if LogFunc != nil {
		LogFunc(
			thumbPath,
			0,
			"image/jpeg",
		)
	}

	return thumbName, nil
}
