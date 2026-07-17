import "../../../css/ui/VideoPlayer.css";
import Vidpop from "./Vidpop.mjs";
import { createIconButton } from "../../utils/svgIconButton";
import { maximizeSVG, muteSVG, vol2SVG, playSVG, pauseSVG } from "../svgs.js";
import { setupSubtitles } from "./vidpopHelpers/subtitles.js";
import { createElement } from "../../components/createElement";

// ---- Video Helpers ----
const determineInitialSource = (baseSrc, availableResolutions = []) => {
  if (!baseSrc || !Array.isArray(availableResolutions) || availableResolutions.length === 0) {
    console.warn("Invalid baseSrc or empty availableResolutions");
    return `${baseSrc || "video"}-360.mp4`;
  }

  const stored = localStorage.getItem("videoQuality");
  const qualityNum = stored ? Number(stored) : null;
  const validQualities = availableResolutions.filter(
    r => typeof r === "number" && !isNaN(r)
  );

  if (validQualities.length === 0) {
    return `${baseSrc}-360.mp4`;
  }

  const lowestAvailable = Math.min(...validQualities);
  const fallback = `${baseSrc}-${lowestAvailable}.mp4`;

  if (qualityNum && validQualities.includes(qualityNum)) {
    return `${baseSrc}-${qualityNum}.mp4`;
  }

  return fallback;
};

// ---- Create Video Element ----
const createVideoElement = (src, resolutions, poster) => {
  const video = document.createElement("video");
  video.setAttribute("class", "video-player");
  video.preload = "metadata";
  video.setAttribute("playsinline", "");

  const baseSrc = src.replace(/\.(mp4|webm)$/, "");

  const defaultSrc = resolutions?.length
    ? determineInitialSource(baseSrc, resolutions)
    : src;

  video.src = defaultSrc;
  video.poster = poster || `${baseSrc}`;

  return video;
};

// ---- Apply Attributes ----
const applyVideoAttributes = (video, attrs = {}) => {
  Object.entries(attrs).forEach(([key, value]) => {
    if (key in video) {
      video[key] = value;
    }
  });
};

// ---- Click-to-Play Toggle ----
const togglePlayOnClick = (video) => {
  const handler = () => (video.paused ? video.play().catch(() => {}) : video.pause());
  video.addEventListener("click", handler);
  return () => video.removeEventListener("click", handler);
};

// ---- Quality Selector ----
export const createQualitySelector = (video, baseSrc, availableResolutions) => {
  const selector = createElement("select", { class: "quality-selector buttonx", "aria-label": "Select Video Quality" });

  const allQualities = [1440, 1080, 720, 480, 360, 240, 144];
  const available = allQualities.filter(q => availableResolutions.includes(q));
  const stored = Number(localStorage.getItem("videoQuality")) || Math.min(...available);

  const fragment = document.createDocumentFragment();
  available.forEach((quality) => {
    const option = createElement("option", { value: `${baseSrc}-${quality}.mp4` }, [`${quality}p`]);
    if (stored === quality) {
      option.setAttribute("selected", "true");
    }
    fragment.appendChild(option);
  });
  selector.appendChild(fragment);

  let activeMetadataHandler = null;

  const switchQuality = (target) => {
    const selectedSrc = target.value;
    const selectedQuality = parseInt(selectedSrc.split("-").pop().replace(".mp4", ""));
    const currentTime = video.currentTime;
    const wasPaused = video.paused;

    localStorage.setItem("videoQuality", selectedQuality);

    // Fixed: Safe asynchronous metadata tracking loop resetting
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
    }
  };
};

// ---- Main Component ----
const VideoPlayer = (
  { src, poster, controls = false, autoplay = false, muted = true, theme = "light", loop = false, subtitles = [], availableResolutions = [] },
  videoId,
) => {
  const container = createElement("div", {
    class: `video-container theme-${theme}`,
    role: "region",
    "aria-label": "Video Player Container"
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
  const baseSrc = src.replace(/\.(mp4|webm)$/, "");
  const video = createVideoElement(src, availableResolutions, poster);

  applyVideoAttributes(video, { controls, muted: userAutoMute, loop });

  // --- Observer for AutoPlay ---
  let observer;
  if (userAutoPlay) {
    const playWhenVisible = (entry) => {
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else if (stopWhenOutOfView) {
        video.pause();
      }
    };
    observer = new IntersectionObserver(
      (entries) => entries.forEach(playWhenVisible),
      { threshold: 0.5 }
    );
    observer.observe(video);
  }

  // --- Play / Pause Button ---
  const playButton = createIconButton({
    classSuffix: "playpause bonw",
    svgMarkup: video.paused ? playSVG : pauseSVG,
    onClick: () => {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    },
    label: "",
    ariaLabel: "Play/Pause"
  });
  controlsl.appendChild(playButton);

  // --- Mute Button ---
  const muteButton = createIconButton({
    classSuffix: "bonw",
    svgMarkup: video.muted ? muteSVG : vol2SVG,
    onClick: () => {
      video.muted = !video.muted;
      localStorage.setItem("videoAutoMute", video.muted ? "true" : "false");
    },
    label: "",
    ariaLabel: video.muted ? "Unmute" : "Mute"
  });
  controlsl.appendChild(muteButton);

  // Fixed: Direct state hook lifecycles avoiding async markup collapse
  const updatePlayStyles = () => {
    const iconContainer = playButton.querySelector('.icon-svg-target') || playButton;
    iconContainer.innerHTML = video.paused ? playSVG : pauseSVG;
    playButton.setAttribute("aria-label", video.paused ? "Play" : "Pause");
  };

  const updateVolumeStyles = () => {
    const iconContainer = muteButton.querySelector('.icon-svg-target') || muteButton;
    iconContainer.innerHTML = video.muted ? muteSVG : vol2SVG;
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
    const { selector, qualities, cleanup } = createQualitySelector(video, baseSrc, availableResolutions);
    controlsl.appendChild(selector);
    availableQualities = qualities;
    qualityCleanup = cleanup;
  }

  // --- Subtitles ---
  if (Array.isArray(subtitles) && subtitles.length > 0) {
    const subtitleContainer = document.createElement("div");
    subtitleContainer.className = "subtitle-container";
    videocon.appendChild(subtitleContainer);
    setupSubtitles(video, subtitles, subtitleContainer);
  }

  // --- Theater Mode Button ---
  const theaterButton = createIconButton({
    classSuffix: "bonw",
    svgMarkup: maximizeSVG,
    onClick: () => {
      video.pause();
      Vidpop(video.currentSrc, videoId, {
        poster,
        theme,
        qualities: availableQualities.map(q => ({
          label: `${q}p`,
          src: `${baseSrc}-${q}.mp4`
        }))
      });
    },
    label: "",
    ariaLabel: "Activate Theater Mode"
  });
  theaterButton.setAttribute("title", "Activate Theater Mode");
  controlsr.appendChild(theaterButton);

  // ---- Build DOM ----
  const fragment = document.createDocumentFragment();
  fragment.appendChild(video);
  fragment.appendChild(controlsContainer);
  videocon.appendChild(fragment);
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