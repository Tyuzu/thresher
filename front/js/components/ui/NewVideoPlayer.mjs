import "../../../css/ui/VideoPlayer.css";
import Vidpop from "./Vidpop.mjs";
import { createIconButton } from "../../utils/svgIconButton";
import { maximizeSVG, muteSVG, vol2SVG, playSVG, pauseSVG } from "../svgs.js";
import { setupSubtitles } from "./vidpopHelpers/subtitles.js";
import { createElement } from "../../components/createElement";

// ---- Helper to get mime type from extension ----
const getMimeType = (src) => {
  const ext = src.split('.').pop().toLowerCase();
  switch (ext) {
    case 'webm': return 'video/webm';
    case 'ogg':  return 'video/ogg';
    case 'ogv':  return 'video/ogg';
    case 'mp4':  return 'video/mp4';
    case 'm4v':  return 'video/mp4';
    case 'm3u8': return 'application/x-mpegURL'; // HLS support (native Safari / specialized players)
    default:     return 'video/mp4'; // Default fallback
  }
};

// ---- Video Helpers ----
const determineInitialSource = (baseSrc, extension, availableResolutions = []) => {
  if (!baseSrc || !Array.isArray(availableResolutions) || availableResolutions.length === 0) {
    console.warn("Invalid baseSrc or empty availableResolutions");
    return `${baseSrc || "video"}-360.${extension}`;
  }

  const stored = localStorage.getItem("videoQuality");
  const qualityNum = stored ? Number(stored) : null;
  const validQualities = availableResolutions.filter(
    r => typeof r === "number" && !isNaN(r)
  );

  if (validQualities.length === 0) {
    return `${baseSrc}-360.${extension}`;
  }

  const lowestAvailable = Math.min(...validQualities);
  const fallback = `${baseSrc}-${lowestAvailable}.${extension}`;

  if (qualityNum && validQualities.includes(qualityNum)) {
    return `${baseSrc}-${qualityNum}.${extension}`;
  }

  return fallback;
};

// ---- Create Video Element ----
const createVideoElement = (src, resolutions, poster) => {
  const video = document.createElement("video");
  video.setAttribute("class", "video-player");
  video.preload = "metadata";
  video.setAttribute("playsinline", "");
  video.setAttribute("crossorigin", "true");

  // Detect extension and drop it from the base source string
  const extension = src.split('.').pop();
  const baseSrc = src.replace(/\.[^/.]+$/, "");

  const defaultSrc = resolutions?.length
    ? determineInitialSource(baseSrc, extension, resolutions)
    : src;

  // Append a modern child <source> element for broader compatibility
  const sourceElem = document.createElement("source");
  sourceElem.src = defaultSrc;
  sourceElem.type = getMimeType(defaultSrc);
  video.appendChild(sourceElem);

  video.poster = poster || `${baseSrc}.jpg`;

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
  const handler = () => (video.paused ? video.play() : video.pause());
  video.addEventListener("click", handler);
  return () => video.removeEventListener("click", handler);
};

// ---- Quality Selector ----
export const createQualitySelector = (video, baseSrc, extension, availableResolutions) => {
  const selector = createElement("select", { class: "quality-selector buttonx" });

  const allQualities = [1440, 1080, 720, 480, 360, 240, 144];
  const available = allQualities.filter(q => availableResolutions.includes(q));
  const stored = Number(localStorage.getItem("videoQuality")) || Math.min(...available);

  const fragment = document.createDocumentFragment();
  available.forEach((quality) => {
    const option = createElement("option", { value: `${baseSrc}-${quality}.${extension}` }, [`${quality}p`]);
    if (stored === quality) {
      option.setAttribute("selected", "true");
    }
    fragment.appendChild(option);
  });
  selector.appendChild(fragment);

  const switchQuality = (target) => {
    const selectedSrc = target.value;
    const selectedQuality = parseInt(selectedSrc.split("-").pop().replace(`.${extension}`, ""));
    const currentTime = video.currentTime;
    const wasPaused = video.paused;

    localStorage.setItem("videoQuality", selectedQuality);

    // Update internal <source> elements and reload the video element
    const sourceElem = video.querySelector("source");
    if (sourceElem) {
      sourceElem.src = selectedSrc;
      sourceElem.type = getMimeType(selectedSrc);
    } else {
      video.src = selectedSrc;
    }
    video.load(); // Required when modifying child <source> tags dynamically

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = currentTime;
      if (!wasPaused) {
        video.play();
      }
    }, { once: true });
  };

  const changeHandler = (e) => switchQuality(e.target);
  selector.addEventListener("change", changeHandler);

  return {
    selector,
    qualities: available,
    cleanup: () => selector.removeEventListener("change", changeHandler)
  };
};

// ---- Main Component ----
const NewVideoPlayer = (
  // eslint-disable-next-line no-unused-vars
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
  const userAutoPlay = localStorage.getItem("videoAutoPlay") === "true";
  const userAutoMute = localStorage.getItem("videoAutoMute") !== "false";
  const stopWhenOutOfView = localStorage.getItem("videoStopWhenOutOfView") === "true";

  // --- Video Element ---
  const extension = src.split('.').pop();
  const baseSrc = src.replace(/\.[^/.]+$/, "");
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
        video.play();
        playButton.innerHTML = pauseSVG;
      } else {
        video.pause();
        playButton.innerHTML = playSVG;
      }
    },
    label: "",
    ariaLabel: "Play/Pause"
  });
  controlsl.appendChild(playButton);

  const removeTogglePlay = togglePlayOnClick(video);

  // --- Quality Selector ---
  let availableQualities = [];
  let qualityCleanup = null;
  if (availableResolutions?.length) {
    const { selector, qualities, cleanup } = createQualitySelector(video, baseSrc, extension, availableResolutions);
    controlsl.appendChild(selector);
    availableQualities = qualities;
    qualityCleanup = cleanup;
  }

  // --- Mute Button ---
  const muteButton = createIconButton({
    classSuffix: "bonw",
    svgMarkup: video.muted ? muteSVG : vol2SVG,
    onClick: () => {
      video.muted = !video.muted;
      muteButton.innerHTML = video.muted ? muteSVG : vol2SVG;
      muteButton.setAttribute("aria-label", video.muted ? "Muted" : "Unmuted");
      localStorage.setItem("videoAutoMute", video.muted ? "true" : "false");
    },
    label: ""
  });
  controlsl.appendChild(muteButton);

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
      const currentSourceElem = video.querySelector("source");
      const currentSrc = currentSourceElem ? currentSourceElem.src : video.src;

      Vidpop(currentSrc, videoId, {
        poster,
        theme,
        qualities: availableQualities.map(q => ({
          label: `${q}p`,
          src: `${baseSrc}-${q}.${extension}`
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

  // ---- Cleanup ----
  container.cleanup = () => {
    removeTogglePlay();
    if (qualityCleanup) {
      qualityCleanup();
    }
    if (observer) {
      observer.disconnect();
    }
  };

  return container;
};

export default NewVideoPlayer;