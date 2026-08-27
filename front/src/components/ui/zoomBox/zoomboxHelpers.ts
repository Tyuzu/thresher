import { dispatchZoomBoxEvent } from "../../../utils/eventDispatcher.js";
import Imagex from "../../base/Imagex.js";
import { createElement } from "../../createElement.js";
import {
  SyntheticZoomEvent,
  ZoomableImageElement,
  ZoomBoxState
} from "./zoomBoxTypes.js";

export type { ZoomBoxState } from "./zoomBoxTypes.js";

/* =========================
   Transformation & Zoom Logic
   ========================= */

export const updateCursor = (
  img: HTMLElement | null,
  state: ZoomBoxState | null
): void => {
  if (!img || !state) return;
  if (state.zoomLevel > 1) {
    img.style.cursor = state.isDragging ? "grabbing" : "grab";
  } else {
    img.style.cursor = "auto";
  }
};

export const updateTransform = (
  img: HTMLElement | null,
  state: ZoomBoxState | null
): void => {
  if (!img || !state) return;
  img.style.transformOrigin = "50% 50%";

  const transforms = [
    `translate(${state.panX || 0}px, ${state.panY || 0}px)`,
    `scale(${state.zoomLevel || 1})`,
    `rotate(${state.angle || 0}deg)`,
    state.flip ? "scaleX(-1)" : ""
  ]
    .filter(Boolean)
    .join(" ");

  img.style.transform = transforms;
  updateCursor(img, state);
};

let zoomIndicatorTimeout: ReturnType<typeof setTimeout> | undefined;

export const showZoomIndicator = (
  container: HTMLElement | null,
  zoomLevel: number
): void => {
  if (!container) return;
  let indicator = container.querySelector<HTMLElement>(".zoombox-zoom-indicator");
  if (!indicator) {
    indicator = createElement("div", { class: "zoombox-zoom-indicator" });
    container.appendChild(indicator);
  }
  indicator.textContent = `${Math.round(zoomLevel * 100)}%`;
  indicator.style.opacity = "1";

  clearTimeout(zoomIndicatorTimeout);
  zoomIndicatorTimeout = setTimeout(() => {
    if (indicator) indicator.style.opacity = "0";
  }, 1000);
};

export const showZoomLimitFeedback = (
  container: HTMLElement | null,
  limitType: "min" | "max"
): void => {
  if (!container) return;

  const existing = container.querySelector(".zoombox-zoom-limit-feedback");
  if (existing) existing.remove();

  const text = limitType === "min" ? "Minimum Zoom Reached" : "Maximum Zoom Reached";

  const feedback = createElement(
    "div",
    {
      class: "zoombox-zoom-limit-feedback",
      style: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "10px 20px",
        background: "rgba(220, 38, 38, 0.85)",
        color: "#fff",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "bold",
        pointerEvents: "none",
        zIndex: "100"
      }
    },
    [text]
  );

  container.appendChild(feedback);
  setTimeout(() => feedback.remove(), 1000);
};

export const smoothZoom = (
  event: WheelEvent | SyntheticZoomEvent,
  img: HTMLImageElement | null,
  state: ZoomBoxState | null,
  container: HTMLElement | null
): void => {
  if (!img || !state) return;
  if (event.preventDefault) event.preventDefault();

  const naturalW = img.naturalWidth || img.width || 800;
  const naturalH = img.naturalHeight || img.height || 600;
  const prevZoom = state.zoomLevel || 1;

  const targetZoom = state.zoomLevel * (event.deltaY > 0 ? 0.9 : 1.1);
  const maxZoom = Math.max(
    naturalW / (img.width || 1),
    naturalH / (img.height || 1),
    16
  );
  const clampedZoom = Math.max(1, Math.min(targetZoom, maxZoom));

  if (clampedZoom !== targetZoom) {
    showZoomLimitFeedback(container, clampedZoom === 1 ? "min" : "max");
  }
  state.zoomLevel = clampedZoom;

  const rect = img.getBoundingClientRect();
  const cursorX = event.clientX;
  const cursorY = event.clientY;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const offsetX = cursorX - centerX;
  const offsetY = cursorY - centerY;
  const zoomFactor = state.zoomLevel / prevZoom;

  state.panX = (state.panX || 0) - offsetX * (zoomFactor - 1);
  state.panY = (state.panY || 0) - offsetY * (zoomFactor - 1);

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const imgWidth = (img.offsetWidth || rect.width) * state.zoomLevel;
  const imgHeight = (img.offsetHeight || rect.height) * state.zoomLevel;
  const maxPanX = Math.max(0, (imgWidth - viewWidth) / 2);
  const maxPanY = Math.max(0, (imgHeight - viewHeight) / 2);

  state.panX = imgWidth <= viewWidth ? 0 : Math.min(maxPanX, Math.max(-maxPanX, state.panX));
  state.panY = imgHeight <= viewHeight ? 0 : Math.min(maxPanY, Math.max(-maxPanY, state.panY));

  updateTransform(img, state);
  showZoomIndicator(container, state.zoomLevel);
  dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
};

/* =========================
   Mouse & Touch Handling
   ========================= */

export const createImageElement = (
  src: string,
  stateRef: ZoomBoxState
): ZoomableImageElement => {
  const img = Imagex({ src }) as ZoomableImageElement;
  img.alt = "ZoomBox Image";
  img.style.transition = "transform 0.15s ease-out";
  img.style.willChange = "transform";
  img.style.transformOrigin = "50% 50%";
  img._stateRef = stateRef;

  img.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (img._stateRef) handleTouchStart(e, img._stateRef, img);
    },
    { passive: false }
  );

  img.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (img._stateRef) handleTouchMove(e, img._stateRef, img);
    },
    { passive: false }
  );

  img.addEventListener("touchend", (e: TouchEvent) => {
    if (img._stateRef) handleTouchEnd(e, img._stateRef);
  });

  return img;
};

export function handleMouseDown(
  e: MouseEvent,
  state: ZoomBoxState | null,
  img: HTMLElement
): void {
  if (!state || (state.zoomLevel || 1) <= 1) return;
  e.preventDefault();

  state.isDragging = true;
  state.startX = e.clientX - (state.panX || 0);
  state.startY = e.clientY - (state.panY || 0);
  state.velocityX = 0;
  state.velocityY = 0;
  img.style.cursor = "grabbing";

  let lastX = e.clientX;
  let lastY = e.clientY;

  const onMove = (moveEvent: MouseEvent) => {
    if (!state.isDragging) return;
    moveEvent.preventDefault();

    state.velocityX = moveEvent.clientX - lastX;
    state.velocityY = moveEvent.clientY - lastY;
    lastX = moveEvent.clientX;
    lastY = moveEvent.clientY;

    state.panX = moveEvent.clientX - (state.startX || 0);
    state.panY = moveEvent.clientY - (state.startY || 0);
    updateTransform(img, state);
  };

  const onUp = () => {
    state.isDragging = false;
    img.style.cursor = state.zoomLevel > 1 ? "grab" : "auto";
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);

    const animateInertia = () => {
      const viewWidth = window.innerWidth;
      const viewHeight = window.innerHeight;
      const imgWidth = img.offsetWidth * state.zoomLevel;
      const imgHeight = img.offsetHeight * state.zoomLevel;
      const maxPanX = Math.max(0, (imgWidth - viewWidth) / 2);
      const maxPanY = Math.max(0, (imgHeight - viewHeight) / 2);

      state.panX += state.velocityX || 0;
      state.panY += state.velocityY || 0;

      state.panX = Math.min(maxPanX, Math.max(-maxPanX, state.panX));
      state.panY = Math.min(maxPanY, Math.max(-maxPanY, state.panY));

      state.velocityX = (state.velocityX || 0) * 0.9;
      state.velocityY = (state.velocityY || 0) * 0.9;
      updateTransform(img, state);

      if (Math.abs(state.velocityX) > 0.1 || Math.abs(state.velocityY) > 0.1) {
        requestAnimationFrame(animateInertia);
      } else {
        dispatchZoomBoxEvent("pan-end", { panX: state.panX, panY: state.panY });
      }
    };
    requestAnimationFrame(animateInertia);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

export function handleTouchStart(
  e: TouchEvent,
  state: ZoomBoxState | null,
  img: HTMLElement
): void {
  if (!state) return;
  if (e.touches.length === 2) {
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    if (t0 && t1) {
      state.initialPinchDistance = Math.hypot(
        t0.clientX - t1.clientX,
        t0.clientY - t1.clientY
      );
      state.initialZoom = state.zoomLevel || 1;
    }
  } else if (e.touches.length === 1) {
    const t0 = e.touches[0];
    if (!t0) return;

    const now = Date.now();
    const tapLength = now - (state.lastTap || 0);
    if (tapLength < 300 && tapLength > 0) {
      state.zoomLevel = state.zoomLevel === 1 ? 2 : 1;
      state.panX = 0;
      state.panY = 0;
      updateTransform(img, state);
      dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
      e.preventDefault();
    }
    state.lastTap = now;
    state.isDragging = true;
    state.startX = t0.clientX - (state.panX || 0);
    state.startY = t0.clientY - (state.panY || 0);
  }
}

export function handleTouchMove(
  e: TouchEvent,
  state: ZoomBoxState | null,
  img: HTMLElement | null
): void {
  if (!state || !img) return;
  const container = img.closest(".gta-map-viewport") || img.parentElement;

  if (e.touches.length === 2 && state.initialPinchDistance) {
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    if (!t0 || !t1) return;

    const newDistance = Math.hypot(
      t0.clientX - t1.clientX,
      t0.clientY - t1.clientY
    );
    const prevZoom = state.zoomLevel || 1;
    const scaleFactor = newDistance / state.initialPinchDistance;
    state.zoomLevel = Math.max(1, Math.min(3, (state.initialZoom || 1) * scaleFactor));

    const zoomFactor = state.zoomLevel / prevZoom;
    const viewCenterX = window.innerWidth / 2;
    const viewCenterY = window.innerHeight / 2;

    state.panX = (state.panX || 0) - (viewCenterX - (state.panX || 0)) * (zoomFactor - 1);
    state.panY = (state.panY || 0) - (viewCenterY - (state.panY || 0)) * (zoomFactor - 1);

    updateTransform(img, state);
    showZoomIndicator(container as HTMLElement | null, state.zoomLevel);
    dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
  }
}

export function handleTouchEnd(e: TouchEvent, state: ZoomBoxState | null): void {
  if (!state) return;
  if (e.touches.length < 2) {
    state.initialPinchDistance = null;
  }
  if (!e.touches.length) {
    state.isDragging = false;
  }
}

/* =========================
   Navigation & Control Buttons
   ========================= */

export const resetTransformState = (state: ZoomBoxState | null): void => {
  if (!state) return;
  state.zoomLevel = 1;
  state.panX = 0;
  state.panY = 0;
  state.angle = 0;
  state.flip = false;
};

export const createNavigationButtons = (
  images: string[],
  state: ZoomBoxState,
  renderMedia?: (index: number) => void
): HTMLElement[] => {
  const prev = createElement(
    "button",
    {
      class: "zoombox-prev-btn",
      "aria-label": "Previous image",
      events: {
        click: () => {
          state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
          resetTransformState(state);
          if (typeof renderMedia === "function") {
            renderMedia(state.currentIndex);
          }
        }
      }
    },
    ["⮘"]
  );

  const next = createElement(
    "button",
    {
      class: "zoombox-next-btn",
      "aria-label": "Next image",
      events: {
        click: () => {
          state.currentIndex = (state.currentIndex + 1) % images.length;
          resetTransformState(state);
          if (typeof renderMedia === "function") {
            renderMedia(state.currentIndex);
          }
        }
      }
    },
    ["⮚"]
  );

  return [prev, next];
};

export const createZoomButtons = (
  img: ZoomableImageElement | null,
  state: ZoomBoxState,
  container: HTMLElement | null
): HTMLElement => {
  if (img) img._stateRef = state;

  const zoomInBtn = createElement(
    "button",
    {
      "aria-label": "Zoom in",
      events: {
        click: () => {
          smoothZoom(
            {
              deltaY: -1,
              clientX: window.innerWidth / 2,
              clientY: window.innerHeight / 2
            },
            img,
            state,
            container
          );
        }
      }
    },
    ["+"]
  );

  const zoomOutBtn = createElement(
    "button",
    {
      "aria-label": "Zoom out",
      events: {
        click: () => {
          smoothZoom(
            {
              deltaY: 1,
              clientX: window.innerWidth / 2,
              clientY: window.innerHeight / 2
            },
            img,
            state,
            container
          );
        }
      }
    },
    ["–"]
  );

  return createElement(
    "div",
    {
      class: "zoombox-zoom-buttons",
      style: {
        position: "absolute",
        bottom: "8vh",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        zIndex: "10"
      }
    },
    [zoomInBtn, zoomOutBtn]
  );
};

/* =========================
   Keyboard Event Handler
   ========================= */

export const handleKeyboard = (
  e: KeyboardEvent,
  images: string[],
  img: HTMLImageElement | null,
  state: ZoomBoxState | null,
  container: HTMLElement | null,
  closeFn?: () => void,
  renderMedia?: (index: number) => void
): void => {
  if (!state) return;

  switch (e.key) {
    case "ArrowRight":
      state.currentIndex = (state.currentIndex + 1) % images.length;
      resetTransformState(state);
      if (typeof renderMedia === "function") renderMedia(state.currentIndex);
      break;
    case "ArrowLeft":
      state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
      resetTransformState(state);
      if (typeof renderMedia === "function") renderMedia(state.currentIndex);
      break;
    case "+":
    case "=":
      smoothZoom(
        {
          deltaY: -1,
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2
        },
        img,
        state,
        container
      );
      break;
    case "-":
    case "_":
      smoothZoom(
        {
          deltaY: 1,
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2
        },
        img,
        state,
        container
      );
      break;
    case "r":
    case "R":
      state.angle = ((state.angle || 0) + 90) % 360;
      updateTransform(img, state);
      dispatchZoomBoxEvent("rotate", { angle: state.angle });
      break;
    case "h":
    case "H":
      state.flip = !state.flip;
      updateTransform(img, state);
      dispatchZoomBoxEvent("flip", { flip: state.flip });
      break;
    case "Escape":
      if (typeof closeFn === "function") closeFn();
      break;
  }
};