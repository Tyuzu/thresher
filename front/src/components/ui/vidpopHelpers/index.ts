import { createControls } from "./controls.js";
import { setupSubtitles, SubtitleSource } from "./subtitles.js";
import { createVideoElement } from "./createVideo.js";
import { setupQualitySwitch } from "./setupQualitySwitch.js";
import { QualityOption } from "./qualitySelector.js";
import { setupProgress } from "./setupProgress.js";
import { setupFullscreenOrientation } from "./setupOrientation.js";
import { setupVideoUtilityFunctions } from "../video-utils/index.js";
import { setupVideoContextMenu } from "./videoContextMenu.js";

// Re-export QualityOption so downstream callers can import it from this module if needed
export type { QualityOption };

// ---- Core Setup Helpers ----
export function setupClickToPlay(video: HTMLVideoElement): () => void {
  const handler = (): void => {
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };
  video.addEventListener("click", handler);

  // Return cleanup so callers can remove listener if needed
  return () => video.removeEventListener("click", handler);
}

export async function setupSubtitleTrack(
  video: HTMLVideoElement,
  subtitles: SubtitleSource[] | undefined,
  container: HTMLElement
): Promise<HTMLElement | null> {
  if (!subtitles || subtitles.length === 0) {
    return null;
  }
  await setupSubtitles(video, subtitles, container);
  return container;
}

export function setupControlBar(
  video: HTMLVideoElement,
  mediaSrc: string,
  qualities: QualityOption[],
  videoid: string,
  container: HTMLElement
): HTMLElement {
  return createControls(video, mediaSrc, qualities, videoid, container);
}

export function setupVideoProgress(
  video: HTMLVideoElement,
  controls: HTMLElement
): void {
  const progressBar = controls.querySelector<HTMLElement>(".progress-bar");
  const progress = controls.querySelector<HTMLElement>(".progress");
  if (progressBar && progress) {
    setupProgress(video, progressBar, progress);
  }
}

export function setupQualitySelector(
  video: HTMLVideoElement,
  qualities: QualityOption[],
  controls: HTMLElement
): void {
  const qualitySelector =
    controls.querySelector<HTMLSelectElement>(".quality-selector");
  if (qualitySelector) {
    setupQualitySwitch(video, qualities, qualitySelector);
  }
}

export function setupFullscreen(
  videoPlayer: HTMLElement,
  video: HTMLVideoElement
): void {
  setupFullscreenOrientation(videoPlayer, video);
}

// ---- Main Generator (uses all helpers) ----
export async function generateVideoPlayer(
  mediaSrc: string,
  poster: string,
  qualities: QualityOption[],
  subtitles: SubtitleSource[],
  videoid: string
): Promise<HTMLDivElement> {
  const videoPlayer = document.createElement("div");
  videoPlayer.id = "video-player";

  // Video element
  const video = createVideoElement({ mediaSrc, poster, qualities });

  // Subtitles
  if (subtitles && subtitles.length !== 0) {
    const subtitleContainer = document.createElement("div");
    subtitleContainer.className = "subtitle-container";
    videoPlayer.appendChild(subtitleContainer);
    await setupSubtitleTrack(video, subtitles, subtitleContainer);
  }

  // Controls
  const controls = setupControlBar(
    video,
    mediaSrc,
    qualities,
    videoid,
    videoPlayer
  );

  // Utilities
  setupVideoUtilityFunctions(video, videoid);
  setupVideoContextMenu(video);

  // Append
  videoPlayer.appendChild(video);
  videoPlayer.appendChild(controls);

  // Progress
  setupVideoProgress(video, controls);

  // Click-to-play
  setupClickToPlay(video);

  // Quality selector
  setupQualitySelector(video, qualities, controls);

  // Fullscreen
  setupFullscreen(videoPlayer, video);

  return videoPlayer;
}