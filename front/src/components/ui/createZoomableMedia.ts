import Imagex from "../base/Imagex.js";
import { createElement } from "../../components/createElement.js";

// ---- Types & Interfaces ----

export type ZoomableMediaType = "image" | "video";

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  isPinching: boolean;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  lastMoveX: number;
  lastMoveY: number;
  momentum: boolean;
  pinchDistance: number;
  zoomLevels: number[];
  zoomIndex: number;
}

export interface ZoomableMediaResult {
  container: HTMLDivElement & { cleanup?: () => void };
  mediaEl: HTMLElement;
  resetZoomBtn: HTMLButtonElement;
  destroy: () => void;
}

// === ZOOMABLE MEDIA FACTORY ===
export const createZoomableMedia = (
  src: string,
  type: ZoomableMediaType = "image"
): ZoomableMediaResult => {
  const state: ZoomState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    velocityX: 0,
    velocityY: 0,
    lastMoveX: 0,
    lastMoveY: 0,
    momentum: false,
    pinchDistance: 0,
    zoomLevels: [1, 1.5, 2, 3, 5, 7],
    zoomIndex: 0,
  };

  const zoomLabel = createElement("div", { class: "zoom-label" }, [
    document.createTextNode("Zoom: 1.0x"),
  ]) as HTMLDivElement;

  const resetZoomBtn = createElement("button", { 
    class: "reset-zoom-btn",
    "aria-label": "Reset Zoom State"
  }, [document.createTextNode("Reset Zoom")]) as HTMLButtonElement;

  resetZoomBtn.addEventListener("click", () => {
    resetZoom();
  });

  let mediaEl: HTMLElement;
  if (type === "image") {
    mediaEl = Imagex({
      src: src,
      alt: "Zoomable Image",
      classes: "zoomable-image",
    }) as HTMLElement;
  } else if (type === "video") {
    mediaEl = createElement("video", { 
      src: src, 
      controls: true, 
      class: "zoomable-image" 
    }) as HTMLVideoElement;
  } else {
    mediaEl = createElement("div", {}) as HTMLElement;
  }

  const container = createElement("div", { class: "zoom-container" }, [
    mediaEl,
    zoomLabel,
    resetZoomBtn
  ]) as HTMLDivElement & { cleanup?: () => void };

  let lastTap = 0;
  let momentumFrameId: number | null = null;

  function resetZoom(): void {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    state.zoomIndex = 0;
    state.momentum = false;
    if (momentumFrameId) cancelAnimationFrame(momentumFrameId);
    applyTransform(true);
  }

  // === Computational Bounds Engine ===
  function getConstraints(): { limitX: number; limitY: number } {
    const width = mediaEl.offsetWidth || 0;
    const height = mediaEl.offsetHeight || 0;
    return {
      limitX: Math.max(0, (width * (state.scale - 1)) / 2),
      limitY: Math.max(0, (height * (state.scale - 1)) / 2)
    };
  }

  function applyTransform(snap = false): void {
    const { limitX, limitY } = getConstraints();

    if (snap || state.scale === 1) {
      state.offsetX = Math.max(-limitX, Math.min(limitX, state.offsetX));
      state.offsetY = Math.max(-limitY, Math.min(limitY, state.offsetY));
    }

    mediaEl.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
    mediaEl.style.transition = snap ? "transform 0.25s cubic-bezier(0.1, 0.5, 0.5, 1)" : "none";

    zoomLabel.replaceChildren(document.createTextNode(`Zoom: ${state.scale.toFixed(1)}x`));
  }

  function momentumScroll(): void {
    if (!state.momentum) return;

    state.offsetX += state.velocityX * 0.92;
    state.offsetY += state.velocityY * 0.92;
    state.velocityX *= 0.92;
    state.velocityY *= 0.92;

    // Enforce bounds containment during momentum sliding frames
    const { limitX, limitY } = getConstraints();
    
    if (state.offsetX < -limitX || state.offsetX > limitX || state.offsetY < -limitY || state.offsetY > limitY) {
      state.offsetX = Math.max(-limitX, Math.min(limitX, state.offsetX));
      state.offsetY = Math.max(-limitY, Math.min(limitY, state.offsetY));
      state.momentum = false;
    }

    applyTransform();

    if (state.momentum && (Math.abs(state.velocityX) > 0.1 || Math.abs(state.velocityY) > 0.1)) {
      momentumFrameId = requestAnimationFrame(momentumScroll);
    } else {
      state.momentum = false;
    }
  }

  // === Focal Point Multi-Touch Tracking Geometry ===
  function getTouchCenter(touches: TouchList): { x: number; y: number } {
    const t0 = touches[0];
    const t1 = touches[1];
    if (!t0 || !t1) return { x: 0, y: 0 };
    return {
      x: (t0.clientX + t1.clientX) / 2,
      y: (t0.clientY + t1.clientY) / 2
    };
  }

  function getPinchDistance(touches: TouchList): number {
    const t0 = touches[0];
    const t1 = touches[1];
    if (!t0 || !t1) return 0;
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // === Combined Touch Event Handlers ===
  mediaEl.addEventListener("touchstart", (e: TouchEvent) => {
    state.momentum = false;
    if (momentumFrameId) cancelAnimationFrame(momentumFrameId);

    if (e.touches.length === 2) {
      state.isPinching = true;
      state.isDragging = false;
      state.pinchDistance = getPinchDistance(e.touches);
      
      const center = getTouchCenter(e.touches);
      state.startX = center.x;
      state.startY = center.y;
    } else if (e.touches.length === 1) {
      const t0 = e.touches[0];
      if (!t0) return;
      state.isDragging = state.scale > 1;
      state.startX = t0.clientX - state.offsetX;
      state.startY = t0.clientY - state.offsetY;
      state.velocityX = 0;
      state.velocityY = 0;
      state.lastMoveX = t0.clientX;
      state.lastMoveY = t0.clientY;
    }
  });

  const onTouchMove = (e: TouchEvent): void => {
    if (state.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const newDist = getPinchDistance(e.touches);
      if (newDist === 0 || state.pinchDistance === 0) return;

      const scaleChange = newDist / state.pinchDistance;
      const oldScale = state.scale;
      state.scale = Math.max(1, Math.min(7, state.scale * scaleChange));

      // Fixed: Adjust offsets relative to physical touch focal center points
      if (state.scale !== oldScale) {
        const center = getTouchCenter(e.touches);
        const ratio = state.scale / oldScale;
        state.offsetX = center.x - (center.x - state.offsetX) * ratio;
        state.offsetY = center.y - (center.y - state.offsetY) * ratio;
      }

      state.pinchDistance = newDist;
      applyTransform();
    } else if (state.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const t0 = e.touches[0];
      if (!t0) return;
      const x = t0.clientX;
      const y = t0.clientY;
      
      state.velocityX = x - state.lastMoveX;
      state.velocityY = y - state.lastMoveY;
      state.lastMoveX = x;
      state.lastMoveY = y;
      
      state.offsetX = x - state.startX;
      state.offsetY = y - state.startY;
      applyTransform();
    }
  };
  mediaEl.addEventListener("touchmove", onTouchMove, { passive: false });

  mediaEl.addEventListener("touchend", (e: TouchEvent) => {
    const now = Date.now();
    const isDoubleTap = (now - lastTap < 300);
    lastTap = now;

    if (isDoubleTap) {
      state.isDragging = false;
      state.isPinching = false;
      state.zoomIndex = (state.zoomIndex + 1) % state.zoomLevels.length;
      // Fixed: explicitly fall back to 1 if lookup returns undefined
      state.scale = state.zoomLevels[state.zoomIndex] ?? 1;
      if (state.scale === 1) {
        state.offsetX = 0;
        state.offsetY = 0;
      }
      applyTransform(true);
      return;
    }

    if (state.isPinching && e.touches.length < 2) {
      state.isPinching = false;
      applyTransform(true);
    } else if (state.isDragging && e.touches.length === 0) {
      state.isDragging = false;
      if (Math.abs(state.velocityX) > 2 || Math.abs(state.velocityY) > 2) {
        state.momentum = true;
        momentumFrameId = requestAnimationFrame(momentumScroll);
      } else {
        applyTransform(true);
      }
    }
  });

  // === Desktop Event Management ===
  const onMouseMove = (e: MouseEvent): void => {
    if (!state.isDragging) return;
    state.velocityX = e.clientX - state.lastMoveX;
    state.velocityY = e.clientY - state.lastMoveY;
    state.lastMoveX = e.clientX;
    state.lastMoveY = e.clientY;
    state.offsetX = e.clientX - state.startX;
    state.offsetY = e.clientY - state.startY;
    applyTransform();
  };

  const onMouseUp = (): void => {
    if (!state.isDragging) return;
    state.isDragging = false;
    if (Math.abs(state.velocityX) > 2 || Math.abs(state.velocityY) > 2) {
      state.momentum = true;
      momentumFrameId = requestAnimationFrame(momentumScroll);
    } else {
      applyTransform(true);
    }
  };

  mediaEl.addEventListener("mousedown", (e: MouseEvent) => {
    if (state.scale > 1) {
      state.momentum = false;
      if (momentumFrameId) cancelAnimationFrame(momentumFrameId);
      state.isDragging = true;
      state.startX = e.clientX - state.offsetX;
      state.startY = e.clientY - state.offsetY;
      state.velocityX = 0;
      state.velocityY = 0;
      state.lastMoveX = e.clientX;
      state.lastMoveY = e.clientY;
      e.preventDefault();
    }
  });

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  mediaEl.addEventListener("wheel", (e: WheelEvent) => {
    e.preventDefault();
    const oldScale = state.scale;
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    state.scale = Math.max(1, Math.min(7, state.scale + delta));

    if (state.scale !== oldScale) {
      // Scale out or in relative to cursor position coordinates
      const rect = mediaEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const ratio = state.scale / oldScale;

      state.offsetX = mouseX - (mouseX - state.offsetX) * ratio;
      state.offsetY = mouseY - (mouseY - state.offsetY) * ratio;
    }

    applyTransform(true);
  }, { passive: false });

  mediaEl.addEventListener("load", () => applyTransform(true));
  if (type === "video") {
    mediaEl.addEventListener("loadedmetadata", () => applyTransform(true));
  }

  // Fixed: Expose clean structural destruction pathway tied to the container lifetime
  const destroy = (): void => {
    state.momentum = false;
    if (momentumFrameId) cancelAnimationFrame(momentumFrameId);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    mediaEl.removeEventListener("touchmove", onTouchMove as EventListener);
  };

  container.cleanup = destroy;

  return { container, mediaEl, resetZoomBtn, destroy };
};