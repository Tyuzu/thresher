import Imagex from "../../base/Imagex.js";
import { createElement } from "../../createElement.js";

/* =========================
   Types & Interfaces
   ========================= */

export interface ZoomBoxState {
  zoomLevel: number;
  panX: number;
  panY: number;
  angle: number;
  flip: boolean;
  isDragging: boolean;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  initialPinchDistance?: number | null;
  initialZoom?: number;
  lastTap?: number;
  currentIndex: number;
}

export interface ZoomableImageElement extends HTMLImageElement {
  _stateRef?: ZoomBoxState;
}

export interface SyntheticZoomEvent {
  deltaY: number;
  clientX: number;
  clientY: number;
  preventDefault?: () => void;
}

/* =========================
   Basic UI Creation Functions
   ========================= */

export const createOverlay = (): HTMLElement => {
  return createElement("div", {
    class: "zoombox-overlay",
    style: {
      opacity: "0",
      transition: "opacity 0.3s ease"
    }
  });
};

export const createVideoElement = (src: string): HTMLVideoElement => {
  return createElement("video", {
    src,
    controls: true,
    autoplay: true,
    style: {
      maxWidth: "90%",
      maxHeight: "90%",
      borderRadius: "6px"
    }
  }) as HTMLVideoElement;
};

export const applyDarkMode = (el: HTMLElement): void => {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    el.classList.add("dark-mode");
  }
};

export const preloadImages = (images: string[], index: number): void => {
  if (!images || !images.length) return;
  const preloadIndexes = [
    index,
    (index + 1) % images.length,
    (index - 1 + images.length) % images.length
  ];
  preloadIndexes.forEach((i) => {
    const img = new Image();
    img.src = images[i];
  });
};

export const createCloseButton = (closeFn?: () => void): HTMLElement => {
  return createElement(
    "button",
    {
      class: "zoombox-close-btn",
      "aria-label": "Close modal",
      events: {
        click: () => {
          if (typeof closeFn === "function") closeFn();
        }
      }
    },
    ["✖"]
  );
};