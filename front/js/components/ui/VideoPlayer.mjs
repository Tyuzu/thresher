import "../../../css/ui/VideoPlayer.css";
import Vidpop from "./Vidpop.mjs";
import { createIconButton } from "../../utils/svgIconButton";
import { maximizeSVG, muteSVG, vol2SVG, playSVG, pauseSVG } from "../svgs.js";
import { setupSubtitles } from "./vidpopHelpers/subtitles.js";
import { createElement } from "../../components/createElement";

// All supported video resolutions ordered descending
const ALL_QUALITIES = [1440, 1080, 720, 480, 360, 240, 144];

// ---- Video Helpers ----

/**
 * Strips supported video file extensions from a source URL.
 */
const getBaseSrc = (src = "") => src.replace(/\.(mp4|webm)$/i, "");

/**
 * Determines the optimal initial source resolution based on localStorage and availability.
 */
const determineInitialSource = (baseSrc, availableResolutions = []) => {
  const validQualities = (Array.isArray(availableResolutions) ? availableResolutions : [])
    .filter((r) => typeof r === "number" && !isNaN(r));

  if (!baseSrc || validQualities.length === 0) {
    if (!baseSrc) console.warn("Invalid baseSrc provided to VideoPlayer");
    return `${baseSrc || "video"}-360.mp4`;
  }

  const stored = Number(localStorage.getItem("videoQuality"));
  const lowestAvailable = Math.min(...validQualities);
  const targetQuality = validQualities.includes(stored) ? stored : lowestAvailable;

  return `${baseSrc}-${targetQuality}.mp4`;
};

/**
 * Creates and configures the standard HTML <video> element.
 */
const createVideoElement = (src, resolutions, poster) => {
  const video = document.createElement("video");
  video.className = "video-player";
  video.preload = "metadata";
  video.setAttribute("playsinline", "");

  const baseSrc = getBaseSrc(src);
  video.src = resolutions?.length ? determineInitialSource(baseSrc, resolutions) : src;
  video.poster = poster || baseSrc;

  return video;
};

/**
 * Safely applies property attributes directly to a DOM node.
 */
const applyVideoAttributes = (video, attrs = {}) => {
  Object.entries(attrs).forEach(([key, value]) => {
    if (key in video) {
      video[key] = value;
    }
  });
};

/**
 * Attaches click handler to toggle video playback state.
 */
const togglePlayOnClick = (video) => {
  const handler = () => (video.paused ? video.play().catch(() => {}) : video.pause());
  video.addEventListener("click", handler);
  return () => video.removeEventListener("click", handler);
};

// ---- Quality Selector ----

export const createQualitySelector = (video, baseSrc, availableResolutions, videoId = "default") => {
  const selector = createElement("select", {
    id: `quality-selector-${videoId}`,
    name: "videoQuality",
    class: "quality-selector buttonx",
    "aria-label": "Select Video Quality",
  });

  const available = ALL_QUALITIES.filter((q) => availableResolutions.includes(q));
  const stored = Number(localStorage.getItem("videoQuality")) || Math.min(...available);

  const fragment = document.createDocumentFragment();
  available.forEach((quality) => {
    const option = createElement(
      "option",
      {
        value: `${baseSrc}-${quality}.mp4`,
        ...(stored === quality ? { selected: "true" } : {}),
      },
      [`${quality}p`]
    );
    fragment.appendChild(option);
  });
  selector.appendChild(fragment);

  let activeMetadataHandler = null;

  const switchQuality = (target) => {
    const selectedSrc = target.value;
    const selectedQuality = parseInt(selectedSrc.split("-").pop().replace(".mp4", ""), 10);
    const currentTime = video.currentTime;
    const wasPaused = video.paused;

    localStorage.setItem("videoQuality", String(selectedQuality));

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

  const changeHandler = (e) => switchQuality(e.target);
  selector.addEventListener("change", changeHandler);

  return {
    selector,
    qualities: available,
    cleanup: () => {
      selector.removeEventListener("change", changeHandler);
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
  },
  videoId = "main"
) => {
  const container = createElement("div", {
    class: `video-container theme-${theme}`,
    role: "region",
    "aria-label": "Video Player Container",
  });

  const controlsContainer = createElement("div", { class: "hflex-sb vcon" });
  const controlsl = createElement("div", { class: "hflex" });
  const controlsr = createElement("div", { class: "hflex" });
  controlsContainer.append(controlsl, controlsr);

  const videocon = createElement("div", { class: "videocon" });

  // --- Load User Settings ---
  const userAutoPlay = localStorage.getItem("videoAutoPlay") === "true" || autoplay;
  const userAutoMute = localStorage.getItem("videoAutoMute") !== "false" && muted;
  const stopWhenOutOfView = localStorage.getItem("videoStopWhenOutOfView") !== "false";

  // --- Video Element ---
  const baseSrc = getBaseSrc(src);
  const video = createVideoElement(src, availableResolutions, poster);

  applyVideoAttributes(video, { controls, muted: userAutoMute, loop });

  // --- Observer for AutoPlay ---
  let observer;
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
  const updateIconButtonIcon = (button, markup) => {
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
  });
  controlsl.appendChild(playButton);

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
  });
  controlsl.appendChild(muteButton);

  // --- UI State Syncing Handlers ---
  const updatePlayStyles = () => {
    updateIconButtonIcon(playButton, video.paused ? playSVG : pauseSVG);
    playButton.setAttribute("aria-label", video.paused ? "Play" : "Pause");
  };

  const updateVolumeStyles = () => {
    updateIconButtonIcon(muteButton, video.muted ? muteSVG : vol2SVG);
    muteButton.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
  };

  video.addEventListener("play", updatePlayStyles);
  video.addEventListener("pause", updatePlayStyles);
  video.addEventListener("volumechange", updateVolumeStyles);

  const removeTogglePlay = togglePlayOnClick(video);

  // --- Quality Selector ---
  let availableQualities = [];
  let qualityCleanup = null;
  if (availableResolutions?.length) {
    const { selector, qualities, cleanup } = createQualitySelector(video, baseSrc, availableResolutions, videoId);
    controlsl.appendChild(selector);
    availableQualities = qualities;
    qualityCleanup = cleanup;
  }

  // --- Subtitles ---
  if (Array.isArray(subtitles) && subtitles.length > 0) {
    const subtitleContainer = createElement("div", { class: "subtitle-container" });
    videocon.appendChild(subtitleContainer);
    setupSubtitles(video, subtitles, subtitleContainer);
  }

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
  });
  theaterButton.setAttribute("title", "Activate Theater Mode");
  controlsr.appendChild(theaterButton);

  // ---- Build DOM ----
  videocon.append(video, controlsContainer);
  container.appendChild(videocon);

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