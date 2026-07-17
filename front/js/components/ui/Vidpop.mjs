import "../../../css/ui/Vidpop.css";
import { createIconButton } from "../../utils/svgIconButton";
import { xSVG } from "../svgs";
import { generateVideoPlayer } from "./vidpopHelpers";

const Vidpop = (mediaSrc, videoid, options = {}) => {
  const { poster = null, theme = "light", qualities = [], subtitles = [] } = options;

  const sightbox = document.createElement("div");
  sightbox.className = `sightbox theme-${theme}`;

  const overlay = document.createElement("div");
  overlay.className = "sightbox-overlay";
  overlay.addEventListener("click", () => removePopup(sightbox));

  const content = document.createElement("div");
  content.className = "sightbox-content";

  // Fixed: Synchronous creation using createIconButton directly (No nested buttons)
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: () => removePopup(sightbox),
    label: "",
    ariaLabel: "Close Theater Mode"
  });

  sightbox.appendChild(overlay);
  sightbox.appendChild(content);
  // Fixed: Close button mounted immediately to secure visual structure
  content.appendChild(closeButton);

  let loadedVideoPlayer = null;

  // Append the generated video player asynchronously
  generateVideoPlayer(mediaSrc, poster, qualities, subtitles, videoid).then(videoPlayer => {
    // Edge case safety verification
    if (!sightbox.parentNode) {
      if (videoPlayer && typeof videoPlayer.cleanup === "function") videoPlayer.cleanup();
      return;
    }
    loadedVideoPlayer = videoPlayer;
    // Insert behind or beside the fixed navigation architecture
    content.insertBefore(videoPlayer, closeButton);
  }).catch(err => {
    console.error("Failed to compile target theater stream engine:", err);
  });

  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.appendChild(sightbox);
  } else {
    document.body.appendChild(sightbox);
  }

  // Attach an isolated component lifecycle destructor hook
  sightbox.cleanup = () => {
    if (loadedVideoPlayer) {
      const videoElement = loadedVideoPlayer.querySelector("video") || loadedVideoPlayer;
      if (videoElement && typeof videoElement.pause === "function") {
        videoElement.pause();
      }
      if (typeof loadedVideoPlayer.cleanup === "function") {
        loadedVideoPlayer.cleanup();
      }
    }
  };

  return sightbox;
};

function removePopup(popupElement) {
  if (!popupElement || !popupElement.parentNode) {
    return;
  }

  // Fixed: Stop audio engine instantly before layout fading transformations run
  if (typeof popupElement.cleanup === "function") {
    popupElement.cleanup();
  } else {
    const video = popupElement.querySelector("video");
    video?.pause?.();
  }

  popupElement.classList.add("fade-out");

  setTimeout(() => {
    if (popupElement.parentNode) {
      popupElement.parentNode.removeChild(popupElement);
    }
  }, 300);
}

export default Vidpop;