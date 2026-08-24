import "../../../css/ui/VideoPlayer.css";
import Vidpop from "./Vidpop.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { maximizeSVG, muteSVG, vol2SVG, playSVG, pauseSVG } from "../svgs/featherSVGs";
import { setupSubtitles } from "./vidpopHelpers/subtitles.js";
import { createElement } from "../../components/createElement.js";

// ---- Types & Interfaces ----

export interface SubtitleTrack {
  src: string;
  label: string;
  srclang: string;
  default?: boolean;
}

export interface VideoPlayerOptions {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  theme?: string;
  loop?: boolean;
  subtitles?: SubtitleTrack[];
  availableResolutions?: number[];
}

export interface QualitySelectorResult {
  selector: HTMLSelectElement | null;
  qualities: number[];
  cleanup: () => void;
}

export interface CleanableVideoContainer extends HTMLDivElement {
  cleanup?: () => void;
}

// All supported video resolutions ordered descending
const ALL_QUALITIES: number[] = [1440, 1080, 720, 480, 360, 240, 144];

// ---- Video Helpers ----

/**
 * Strips video file extensions (.mp4, .webm, etc.) from a source URL.
 */
const getBaseSrc = (src: string = ""): string => {
  if (typeof src !== "string") return "";
  return src.replace(/\.(mp4|webm|mkv|mov)(\?.*)?$/i, "");
};

/**
 * Determines the optimal initial source resolution based on localStorage and availability.
 */
const determineInitialSource = (
  originalSrc: string,
  availableResolutions: number[] = []
): string => {
  if (!originalSrc) {
    console.warn("Invalid originalSrc provided to VideoPlayer");
    return "";
  }

  const validQualities = (Array.isArray(availableResolutions) ? availableResolutions : [])
    .filter((r): r is number => typeof r === "number" && !isNaN(r));

  // If no resolution variants exist, return the original uploaded file URL
  if (validQualities.length === 0) {
    return originalSrc;
  }

  const baseSrc = getBaseSrc(originalSrc);
  const stored = Number(localStorage.getItem("videoQuality"));
  
  // Choose requested resolution if available; default to 360p or lowest available
  const targetQuality = validQualities.includes(stored) 
    ? stored 
    : (validQualities.includes(360) ? 360 : Math.min(...validQualities));

  return `${baseSrc}-${targetQuality}.mp4`;
};

/**
 * Creates and configures the standard HTML <video> element via createElement.
 */
const createVideoElement = (
  src: string,
  resolutions: number[],
  poster?: string
): HTMLVideoElement => {
  const initialSrc = determineInitialSource(src, resolutions);
  const baseSrc = getBaseSrc(src);

  return createElement("video", {
    class: "video-player",
    preload: "metadata",
    playsinline: "",
    src: initialSrc,
    poster: poster || `${baseSrc}-poster.jpg`
  }) as HTMLVideoElement;
};

/**
 * Safely applies property attributes directly to a DOM node.
 */
const applyVideoAttributes = (
  video: HTMLVideoElement,
  attrs: Record<string, unknown> = {}
): void => {
  Object.entries(attrs).forEach(([key, value]) => {
    if (key in video) {
      (video as unknown as Record<string, unknown>)[key] = value;
    }
  });
};

/**
 * Attaches click handler to toggle video playback state.
 */
const togglePlayOnClick = (video: HTMLVideoElement): (() => void) => {
  const handler = (): void => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };
  video.addEventListener("click", handler);
  return () => video.removeEventListener("click", handler);
};

// ---- Quality Selector ----

export const createQualitySelector = (
  video: HTMLVideoElement,
  baseSrc: string,
  availableResolutions: number[] = [],
  videoId: string = "default"
): QualitySelectorResult => {
  const available = ALL_QUALITIES.filter((q) => availableResolutions.includes(q));
  if (available.length === 0) {
    return { selector: null, qualities: [], cleanup: () => {} };
  }

  const stored = Number(localStorage.getItem("videoQuality"));
  const defaultQuality = available.includes(stored) 
    ? stored 
    : (available.includes(360) ? 360 : Math.min(...available));

  // Generate option elements via createElement
  const optionElements = available.map((quality) =>
    createElement(
      "option",
      {
        value: `${baseSrc}-${quality}.mp4`,
        ...(defaultQuality === quality ? { selected: true } : {})
      },
      [`${quality}p`]
    )
  );

  let activeMetadataHandler: (() => void) | null = null;

  const switchQuality = (target: HTMLSelectElement): void => {
    const selectedSrc = target.value;
    
    // Safely parse resolution number from string (e.g., "...-720.mp4")
    const match = selectedSrc.match(/-(\d+)\.mp4$/);
    const selectedQuality = match ? parseInt(match[1], 10) : null;

    if (selectedQuality) {
      localStorage.setItem("videoQuality", String(selectedQuality));
    }

    const currentTime = video.currentTime;
    const wasPaused = video.paused;

    if (activeMetadataHandler) {
      video.removeEventListener("loadedmetadata", activeMetadataHandler);
    }

    activeMetadataHandler = () => {
      video.currentTime = currentTime;
      if (!wasPaused) {
        video.play().catch(() => {});
      }
      activeMetadataHandler = null;
    };

    video.src = selectedSrc;
    video.addEventListener("loadedmetadata", activeMetadataHandler, { once: true });
  };

  const selector = createElement(
    "select",
    {
      id: `quality-selector-${videoId}`,
      name: "videoQuality",
      class: "quality-selector buttonx",
      "aria-label": "Select Video Quality",
      events: {
        change: (e: Event) => switchQuality(e.target as HTMLSelectElement)
      }
    },
    optionElements
  ) as HTMLSelectElement;

  return {
    selector,
    qualities: available,
    cleanup: () => {
      if (activeMetadataHandler) {
        video.removeEventListener("loadedmetadata", activeMetadataHandler);
      }
    },
  };
};

// ---- Main Component ----

const VideoPlayer = (
  {
    src,
    poster,
    controls = false,
    autoplay = false,
    muted = true,
    theme = "light",
    loop = false,
    subtitles = [],
    availableResolutions = [],
  }: VideoPlayerOptions,
  videoId: string = "main"
): CleanableVideoContainer => {
  // --- Load User Settings ---
  const userAutoPlay = localStorage.getItem("videoAutoPlay") === "true" || autoplay;
  const userAutoMute = localStorage.getItem("videoAutoMute") !== "false" && muted;
  const stopWhenOutOfView = localStorage.getItem("videoStopWhenOutOfView") !== "false";

  // --- Video Element ---
  const baseSrc = getBaseSrc(src);
  const video = createVideoElement(src, availableResolutions, poster);

  applyVideoAttributes(video, { controls, muted: userAutoMute, loop });

  // --- Observer for AutoPlay ---
  let observer: IntersectionObserver | undefined;
  if (userAutoPlay) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else if (stopWhenOutOfView) {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
  }

  // Helper to update button inner markup reliably
  const updateIconButtonIcon = (button: HTMLElement | null, markup: string): void => {
    if (!button) return;
    const iconContainer = button.querySelector(".icon-svg-target") || button;
    iconContainer.innerHTML = markup;
  };

  // --- Play / Pause Button ---
  const playButton = createIconButton({
    id: `play-btn-${videoId}`,
    name: "playPause",
    classSuffix: "playpause bonw",
    svgMarkup: video.paused ? playSVG : pauseSVG,
    onClick: () => (video.paused ? video.play().catch(() => {}) : video.pause()),
    label: "",
    ariaLabel: "Play/Pause",
  }) as HTMLElement;

  // --- Mute Button ---
  const muteButton = createIconButton({
    id: `mute-btn-${videoId}`,
    name: "muteToggle",
    classSuffix: "bonw",
    svgMarkup: video.muted ? muteSVG : vol2SVG,
    onClick: () => {
      video.muted = !video.muted;
      localStorage.setItem("videoAutoMute", String(video.muted));
    },
    label: "",
    ariaLabel: video.muted ? "Unmute" : "Mute",
  }) as HTMLElement;

  // --- UI State Syncing Handlers ---
  const updatePlayStyles = (): void => {
    updateIconButtonIcon(playButton, video.paused ? playSVG : pauseSVG);
    playButton.setAttribute("aria-label", video.paused ? "Play" : "Pause");
  };

  const updateVolumeStyles = (): void => {
    updateIconButtonIcon(muteButton, video.muted ? muteSVG : vol2SVG);
    muteButton.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
  };

  video.addEventListener("play", updatePlayStyles);
  video.addEventListener("pause", updatePlayStyles);
  video.addEventListener("volumechange", updateVolumeStyles);

  const removeTogglePlay = togglePlayOnClick(video);

  // --- Left Controls Section ---
  const controlslChildren: HTMLElement[] = [playButton, muteButton];

  // --- Quality Selector ---
  let availableQualities: number[] = [];
  let qualityCleanup: (() => void) | null = null;
  if (Array.isArray(availableResolutions) && availableResolutions.length > 0) {
    const { selector, qualities, cleanup } = createQualitySelector(video, baseSrc, availableResolutions, videoId);
    if (selector) {
      controlslChildren.push(selector);
    }
    availableQualities = qualities;
    qualityCleanup = cleanup;
  }

  const controlsl = createElement("div", { class: "hflex" }, controlslChildren);

  // --- Theater Mode Button ---
  const theaterButton = createIconButton({
    id: `theater-btn-${videoId}`,
    name: "theaterMode",
    classSuffix: "bonw",
    svgMarkup: maximizeSVG,
    onClick: () => {
      video.pause();
      Vidpop(video.currentSrc, videoId, {
        poster,
        theme,
        qualities: availableQualities.map((q) => ({
          label: `${q}p`,
          src: `${baseSrc}-${q}.mp4`,
        })),
      });
    },
    label: "",
    ariaLabel: "Activate Theater Mode",
  }) as HTMLElement;
  theaterButton.setAttribute("title", "Activate Theater Mode");

  const controlsr = createElement("div", { class: "hflex" }, [theaterButton]);

  // --- Controls Bar ---
  const controlsContainer = createElement("div", { class: "hflex-sb vcon" }, [controlsl, controlsr]);

  // --- Videocon Shell ---
  const videoconChildren: HTMLElement[] = [video, controlsContainer];

  // --- Subtitles ---
  if (Array.isArray(subtitles) && subtitles.length > 0) {
    const subtitleContainer = createElement("div", { class: "subtitle-container" });
    videoconChildren.push(subtitleContainer);
    setupSubtitles(video, subtitles, subtitleContainer);
  }

  const videocon = createElement("div", { class: "videocon" }, videoconChildren);

  // ---- Main Container ----
  const container = createElement("div", {
    class: `video-container theme-${theme}`,
    role: "region",
    "aria-label": "Video Player Container",
  }, [videocon]) as CleanableVideoContainer;

  // ---- Complete Cleanup ----
  container.cleanup = () => {
    removeTogglePlay();
    video.removeEventListener("play", updatePlayStyles);
    video.removeEventListener("pause", updatePlayStyles);
    video.removeEventListener("volumechange", updateVolumeStyles);

    if (qualityCleanup) {
      qualityCleanup();
    }
    if (observer) {
      observer.disconnect();
    }
  };

  return container;
};

export default VideoPlayer;