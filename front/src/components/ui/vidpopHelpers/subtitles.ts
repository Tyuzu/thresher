import { parseVTT } from "./vutils.js";

export interface SubtitleSource {
  label: string;
  srclang: string;
  src: string;
}

export interface VTTItem {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleTrack extends SubtitleSource {
  data: VTTItem[];
}

export async function setupSubtitles(
  video: HTMLVideoElement,
  subtitles: SubtitleSource[],
  subtitleContainer: HTMLElement
): Promise<SubtitleTrack[]> {
  const subtitleTracks: SubtitleTrack[] = await Promise.all(
    subtitles.map(async (subtitle) => ({
      label: subtitle.label,
      srclang: subtitle.srclang,
      src: subtitle.src,
      data: await fetch(subtitle.src)
        .then((res) => res.text())
        .then(parseVTT),
    }))
  );

  const currentSubtitleTrackIndex = -1;

  video.addEventListener("timeupdate", () => {
    if (currentSubtitleTrackIndex === -1) {
      subtitleContainer.textContent = "";
      subtitleContainer.style.display = "none";
      return;
    }

    const currentTime = video.currentTime;
    const track = subtitleTracks[currentSubtitleTrackIndex];
    const activeSubtitle = track.data.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );

    subtitleContainer.textContent = activeSubtitle ? activeSubtitle.text : "";
    subtitleContainer.style.display = activeSubtitle ? "block" : "none";
  });

  return subtitleTracks;
}