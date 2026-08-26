import "../../../css/ui/vidpop.css";
import "../../../css/ui/Sightbox.css";
import { createElement } from "../createElement.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { xSVG } from "../svgs/featherSVGs";
import {
  generateVideoPlayer,
  QualityOption,
} from "./vidpopHelpers/index.js";
import { SubtitleSource as SubtitleOption } from "./vidpopHelpers/subtitles.js";


export type { QualityOption, SubtitleOption };

export interface VidpopOptions {
  poster?: string | null;
  theme?: "light" | "dark" | string;
  qualities?: QualityOption[];
  subtitles?: SubtitleOption[];
}

export interface CleanableElement extends HTMLElement {
  cleanup?: () => void;
}

const Vidpop = (
  mediaSrc: string,
  videoid?: string,
  options: VidpopOptions = {}
): CleanableElement => {
  const {
    poster = null,
    theme = "light",
    qualities = [],
    subtitles = []
  } = options;

  // 1. Instantiate the Close Button
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: () => removePopup(sightbox),
    label: "",
    ariaLabel: "Close Theater Mode"
  });

  // 2. Build DOM layout tree declaratively using createElement
  const content = createElement("div", { class: "sightbox-content" }, [
    closeButton
  ]);

  const overlay = createElement("div", {
    class: "sightbox-overlay",
    events: {
      click: () => removePopup(sightbox)
    }
  });

  const sightbox: CleanableElement = createElement(
    "div",
    { class: `sightbox theme-${theme}` },
    [overlay, content]
  );

  let loadedVideoPlayer: CleanableElement | null = null;

  // 3. Append the generated video player asynchronously
  generateVideoPlayer(
    mediaSrc,
    poster || "",
    qualities,
    subtitles,
    videoid || "default"
  )
    .then((videoPlayer: CleanableElement) => {
      // Edge case safety verification
      if (!sightbox.parentNode) {
        if (videoPlayer && typeof videoPlayer.cleanup === "function") {
          videoPlayer.cleanup();
        }
        return;
      }
      loadedVideoPlayer = videoPlayer;
      // Insert before closeButton to preserve target DOM order
      content.insertBefore(videoPlayer, closeButton);
    })
    .catch((err: unknown) => {
      console.error("Failed to compile target theater stream engine:", err);
    });

  // 4. Mount to app root or document body
  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.appendChild(sightbox);
  } else {
    document.body.appendChild(sightbox);
  }

  // 5. Attach isolated component lifecycle destructor hook
  sightbox.cleanup = () => {
    if (loadedVideoPlayer) {
      const videoElement =
        loadedVideoPlayer.querySelector<HTMLVideoElement>("video") ||
        (loadedVideoPlayer as unknown as HTMLVideoElement);

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

function removePopup(popupElement: CleanableElement | null): void {
  if (!popupElement || !popupElement.parentNode) {
    return;
  }

  if (typeof popupElement.cleanup === "function") {
    popupElement.cleanup();
  } else {
    const video = popupElement.querySelector<HTMLVideoElement>("video");
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
export { Vidpop as VidpopComponent, removePopup };