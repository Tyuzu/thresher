export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTime(timestamp: string): number {
  return timestamp
    .split(":")
    .reduce((acc, val) => acc * 60 + parseFloat(val), 0);
}

function parseVTT(vttText: string): SubtitleCue[] {
  const lines = vttText.split("\n").map((line) => line.trim());
  const subtitles: SubtitleCue[] = [];
  let currentSubtitle: SubtitleCue | null = null;

  lines.forEach((line) => {
    if (line.includes("-->")) {
      const [start, end] = line.split(" --> ").map(parseTime);
      currentSubtitle = { start, end, text: "" };
    } else if (currentSubtitle && line) {
      currentSubtitle.text += line + " ";
    }

    if (currentSubtitle && !line) {
      subtitles.push({
        ...currentSubtitle,
        text: currentSubtitle.text.trim(),
      });
      currentSubtitle = null;
    }
  });

  return subtitles;
}

function toggleFullScreen(video: HTMLElement): Promise<void> {
  return document.fullscreenElement
    ? document.exitFullscreen()
    : video.requestFullscreen();
}

function togglePictureInPicture(
  video: HTMLVideoElement
): Promise<PictureInPictureWindow | void> {
  return document.pictureInPictureElement
    ? document.exitPictureInPicture()
    : video.requestPictureInPicture();
}

function downloadVideo(mediaSrc: string): void {
  const anchor = document.createElement("a");
  anchor.href = mediaSrc;
  anchor.download = "video.mp4";
  anchor.click();
}

export function subtitles(video: HTMLVideoElement): void {
  const track = video.textTracks?.[0];
  if (track) {
    track.mode = track.mode === "showing" ? "hidden" : "showing";
  }
}

export {
  parseVTT,
  parseTime,
  toggleFullScreen,
  togglePictureInPicture,
  downloadVideo,
};