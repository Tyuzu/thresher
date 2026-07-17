import Imagex from "../base/Imagex";
import { createElement } from "../../components/createElement";

// === ZOOMABLE MEDIA FACTORY ===
export const createZoomableMedia = (src, type = "image") => {
  const state = {
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
    document.createTextNode("Zoom: 1.0x")
  ]);

  const resetZoomBtn = createElement("button", { 
    class: "reset-zoom-btn",
    "aria-label": "Reset Zoom State"
  }, [document.createTextNode("Reset Zoom")]);

  resetZoomBtn.addEventListener("click", () => {
    resetZoom();
  });

  let mediaEl;
  if (type === "image") {
    mediaEl = Imagex({
      src: src,
      alt: "Zoomable Image",
      classes: "zoomable-image",
    });
  } else if (type === "video") {
    mediaEl = createElement("video", { 
      src: src, 
      controls: true, 
      class: "zoomable-image" 
    });
  }

  const container = createElement("div", { class: "zoom-container" }, [
    mediaEl,
    zoomLabel,
    resetZoomBtn
  ]);

  let lastTap = 0;
  let momentumFrameId = null;

  function resetZoom() {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    state.zoomIndex = 0;
    state.momentum = false;
    if (momentumFrameId) cancelAnimationFrame(momentumFrameId);
    applyTransform(true);
  }

  // === Computational Bounds Engine ===
  function getConstraints() {
    const width = mediaEl.offsetWidth || 0;
    const height = mediaEl.offsetHeight || 0;
    return {
      limitX: Math.max(0, (width * (state.scale - 1)) / 2),
      limitY: Math.max(0, (height * (state.scale - 1)) / 2)
    };
  }

  function applyTransform(snap = false) {
    const { limitX, limitY } = getConstraints();

    if (snap || state.scale === 1) {
      state.offsetX = Math.max(-limitX, Math.min(limitX, state.offsetX));
      state.offsetY = Math.max(-limitY, Math.min(limitY, state.offsetY));
    }

    mediaEl.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
    mediaEl.style.transition = snap ? "transform 0.25s cubic-bezier(0.1, 0.5, 0.5, 1)" : "none";

    zoomLabel.replaceChildren(document.createTextNode(`Zoom: ${state.scale.toFixed(1)}x`));
  }

  function momentumScroll() {
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
  function getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // === Combined Touch Event Handlers ===
  mediaEl.addEventListener("touchstart", (e) => {
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
      state.isDragging = state.scale > 1;
      state.startX = e.touches[0].clientX - state.offsetX;
      state.startY = e.touches[0].clientY - state.offsetY;
      state.velocityX = 0;
      state.velocityY = 0;
      state.lastMoveX = e.touches[0].clientX;
      state.lastMoveY = e.touches[0].clientY;
    }
  });

  const onTouchMove = (e) => {
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
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      
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

  mediaEl.addEventListener("touchend", (e) => {
    const now = Date.now();
    const isDoubleTap = (now - lastTap < 300);
    lastTap = now;

    if (isDoubleTap) {
      state.isDragging = false;
      state.isPinching = false;
      state.zoomIndex = (state.zoomIndex + 1) % state.zoomLevels.length;
      state.scale = state.zoomLevels[state.zoomIndex];
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
  const onMouseMove = (e) => {
    if (!state.isDragging) return;
    state.velocityX = e.clientX - state.lastMoveX;
    state.velocityY = e.clientY - state.lastMoveY;
    state.lastMoveX = e.clientX;
    state.lastMoveY = e.clientY;
    state.offsetX = e.clientX - state.startX;
    state.offsetY = e.clientY - state.startY;
    applyTransform();
  };

  const onMouseUp = () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    if (Math.abs(state.velocityX) > 2 || Math.abs(state.velocityY) > 2) {
      state.momentum = true;
      momentumFrameId = requestAnimationFrame(momentumScroll);
    } else {
      applyTransform(true);
    }
  };

  mediaEl.addEventListener("mousedown", (e) => {
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

  mediaEl.addEventListener("wheel", (e) => {
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
  container.cleanup = () => {
    state.momentum = false;
    if (momentumFrameId) cancelAnimationFrame(momentumFrameId);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    mediaEl.removeEventListener("touchmove", onTouchMove);
  };

  return { container, mediaEl, resetZoomBtn, destroy: container.cleanup };
};