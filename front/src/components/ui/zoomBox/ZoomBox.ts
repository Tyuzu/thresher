import "../../../../css/ui/ZoomBox.css";
import { createElement } from "../../createElement.js";
import {
  createImageElement,
  smoothZoom,
  handleMouseDown,
  createNavigationButtons,
  createZoomButtons,
  handleKeyboard
} from "./zoomboxHelpers.js";
import type { ZoomBoxState } from "./zoomBoxTypes.js";
import {
  createOverlay,
  createCloseButton,
  applyDarkMode,
  createVideoElement,
  preloadImages
} from "./zoomBoxTypes.js";
import { dispatchZoomBoxEvent } from "../../../utils/eventDispatcher.js";

type MediaType = "video" | "image";

export interface CleanableMediaElement extends HTMLElement {
  _cleanupListeners?: () => void;
}

// Detect media type by file extension
function getMediaType(src: string): MediaType {
  const lower = src.toLowerCase();
  if (/\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower)) {
    return "video";
  }
  return "image";
}

// Extended internal state tracking for ZoomBox
interface InternalZoomBoxState extends ZoomBoxState {
  currentMedia: CleanableMediaElement | null;
  mediaType: MediaType | null;
}

// Main ZoomBox factory
const ZoomBox = (mediaItems: string[], initialIndex: number = 0): void => {
  if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
    return;
  }
  if (document.getElementById("zoombox")) {
    return;
  }

  const state: InternalZoomBoxState = {
    zoomLevel: 1,
    panX: 0,
    panY: 0,
    angle: 0,
    flip: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    velocityX: 0,
    velocityY: 0,
    lastTap: 0,
    currentIndex: Math.max(0, Math.min(initialIndex, mediaItems.length - 1)),
    currentMedia: null,
    mediaType: null
  };

  // --- Close logic ---
  const closeZoomBox = (): void => {
    const box = document.getElementById("zoombox");
    if (!box) return;

    const transitionDuration =
      parseFloat(getComputedStyle(box).transitionDuration || "0.3") * 1000;

    box.style.opacity = "0";
    setTimeout(() => {
      if (state.currentMedia && state.currentMedia._cleanupListeners) {
        state.currentMedia._cleanupListeners();
      }
      box.remove();
      document.removeEventListener("keydown", onKeyDown);
      dispatchZoomBoxEvent("close");
    }, transitionDuration);
  };

  const closeBtn = createCloseButton(closeZoomBox);

  // Build central container structure via createElement
  const content = createElement(
    "div",
    {
      dataset: { zoomboxContent: "" },
      tabindex: "-1",
      style: { outline: "none" }
    },
    [closeBtn]
  );

  // Construct root overlay structure
  const zoombox = createOverlay();
  Object.assign(zoombox, {
    id: "zoombox",
    role: "dialog"
  });
  zoombox.setAttribute("aria-modal", "true");
  zoombox.appendChild(content);
  applyDarkMode(zoombox);

  let zoomButtonsContainer: HTMLElement | null = null;

  // --- Media renderer ---
  const renderMedia = (index: number): void => {
    // 1. Cleanup previous media & event listeners
    if (state.currentMedia) {
      if (state.currentMedia._cleanupListeners) {
        state.currentMedia._cleanupListeners();
      }
      state.currentMedia.remove();
    }

    // 2. Clean up old zoom buttons if they exist
    if (zoomButtonsContainer) {
      zoomButtonsContainer.remove();
      zoomButtonsContainer = null;
    }

    const src = mediaItems[index];
    const type = getMediaType(src);
    state.mediaType = type;

    const element = (
      type === "video"
        ? createVideoElement(src)
        : createImageElement(src, state)
    ) as CleanableMediaElement;

    // 3. Setup interactions (Images only)
    if (type === "image") {
      const imgElement = element as HTMLImageElement;
      const onWheel = (e: WheelEvent) => smoothZoom(e, imgElement, state, zoombox);
      const onDown = (e: MouseEvent) => handleMouseDown(e, state, element);

      element.addEventListener("wheel", onWheel as EventListener, { passive: false });
      element.addEventListener("mousedown", onDown as EventListener);

      element._cleanupListeners = () => {
        element.removeEventListener("wheel", onWheel as EventListener);
        element.removeEventListener("mousedown", onDown as EventListener);
      };

      preloadImages(mediaItems, index);

      // Dynamically inject zoom UI only when viewing an image
      zoomButtonsContainer = createZoomButtons(imgElement, state, zoombox);
      zoombox.appendChild(zoomButtonsContainer);
    }

    // 4. Insert before close button to maintain target DOM layout order
    content.insertBefore(element, closeBtn);
    state.currentMedia = element;

    dispatchZoomBoxEvent("mediachange", { index, src, type });
  };

  // --- Run Initial Render ---
  renderMedia(state.currentIndex);

  // --- Navigation controls ---
  if (mediaItems.length > 1) {
    const [prevBtn, nextBtn] = createNavigationButtons(
      mediaItems,
      state,
      renderMedia
    );
    content.appendChild(prevBtn);
    content.appendChild(nextBtn);
  }

  // --- Mount safely ---
  const mountPoint = document.getElementById("app") || document.body;
  mountPoint.appendChild(zoombox);

  // --- Keyboard handling ---
  const onKeyDown = (e: KeyboardEvent): void => {
    handleKeyboard(
      e,
      mediaItems,
      state.currentMedia as HTMLImageElement | null,
      state,
      zoombox,
      closeZoomBox,
      renderMedia
    );
  };
  document.addEventListener("keydown", onKeyDown);

  // --- Reveal transition ---
  requestAnimationFrame(() => {
    zoombox.style.opacity = "1";
    closeBtn.focus();
    dispatchZoomBoxEvent("open", { index: state.currentIndex });
  });
};

export default ZoomBox;
export { ZoomBox as ZoomBoxComponent };