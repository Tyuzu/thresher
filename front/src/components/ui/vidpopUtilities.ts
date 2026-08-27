export interface VideoUtilityController {
  destroy: () => void;
}

/**
 * Advanced Video Utility Management Module
 * Implements performance-optimized zoom, pan, transformation, and hotkey listeners.
 */
function setupVideoUtilityFunctions(
  video: HTMLVideoElement | null,
  videoid?: string
): VideoUtilityController | null {
  if (!video) return null;

  const container: HTMLElement = video.parentElement || document.body;

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    container.classList.add("dark-mode");
  }

  let zoomLevel: number = 1;
  let panX: number = 0;
  let panY: number = 0;
  let angle: number = 0;
  let flip: boolean = false;
  const minZoom: number = 1;
  const maxZoom: number = 8;

  let isDragging: boolean = false;
  let startX: number = 0;
  let startY: number = 0;
  let initialPinchDistance: number = 0;
  let initialPinchZoom: number = 1;

  let saveIntervalId: ReturnType<typeof setInterval> | null = null;

  // Fixed: Performance rendering pipeline avoiding debounce latency
  const updateTransform = (): void => {
    video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${
      flip ? "scaleX(-1)" : ""
    }`;
    if (zoomLevel === 1) {
      video.style.transition = "transform 0.2s ease";
    } else {
      video.style.transition = "none";
    }
  };

  const constrainPan = (): void => {
    const rect: DOMRect = video.getBoundingClientRect();
    const maxPanX: number = Math.max(0, (rect.width * (zoomLevel - 1)) / 2);
    const maxPanY: number = Math.max(0, (rect.height * (zoomLevel - 1)) / 2);

    panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
    panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
  };

  const changeZoom = (delta: number, event?: MouseEvent | WheelEvent): void => {
    const rect: DOMRect = video.getBoundingClientRect();
    const cursorX: number = event ? event.clientX - rect.left : rect.width / 2;
    const cursorY: number = event ? event.clientY - rect.top : rect.height / 2;

    const prevZoom: number = zoomLevel;
    zoomLevel *= delta > 0 ? 0.92 : 1.08;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));

    const zoomFactor: number = zoomLevel / prevZoom;

    // Anchor offsets directly against coordinate interaction origins
    panX -= (cursorX - rect.width / 2) * (zoomFactor - 1);
    panY -= (cursorY - rect.height / 2) * (zoomFactor - 1);

    constrainPan();
    updateTransform();
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    changeZoom(event.deltaY, event);
  };

  const flipVideo = (): void => {
    flip = !flip;
    updateTransform();
  };

  // === Unified Drag / Pointer Interactions ===
  const handleDragStart = (clientX: number, clientY: number): void => {
    if (zoomLevel <= 1) return;
    isDragging = true;
    startX = clientX - panX;
    startY = clientY - panY;
  };

  const handleDragMove = (clientX: number, clientY: number): void => {
    if (!isDragging) return;
    panX = clientX - startX;
    panY = clientY - startY;
    constrainPan();
    updateTransform();
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (zoomLevel <= 1) return;
    event.preventDefault();
    handleDragStart(event.clientX, event.clientY);
  };

  const onMouseMove = (event: MouseEvent): void => {
    handleDragMove(event.clientX, event.clientY);
  };

  const onMouseUp = (): void => {
    isDragging = false;
  };

  // === Unified Multi-Touch Lifecycle Engine ===
  const onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 2) {
      event.preventDefault();
      isDragging = false; // Override drag with pinch mechanics
      const t0 = event.touches[0];
      const t1 = event.touches[1];
      if (t0 && t1) {
        initialPinchDistance = Math.hypot(
          t0.clientX - t1.clientX,
          t0.clientY - t1.clientY
        );
      }
      initialPinchZoom = zoomLevel;
    } else if (event.touches.length === 1) {
      const t0 = event.touches[0];
      if (t0) {
        handleDragStart(t0.clientX, t0.clientY);
      }
    }
  };

  const onTouchMove = (event: TouchEvent): void => {
    if (event.touches.length === 2) {
      event.preventDefault();
      const t0 = event.touches[0];
      const t1 = event.touches[1];
      if (!t0 || !t1) return;

      const currentDistance: number = Math.hypot(
        t0.clientX - t1.clientX,
        t0.clientY - t1.clientY
      );
      if (initialPinchDistance === 0) return;

      const scaleFactor: number = currentDistance / initialPinchDistance;
      zoomLevel = Math.max(
        minZoom,
        Math.min(maxZoom, initialPinchZoom * scaleFactor)
      );
      constrainPan();
      updateTransform();
    } else if (event.touches.length === 1 && isDragging) {
      const t0 = event.touches[0];
      if (t0) {
        handleDragMove(t0.clientX, t0.clientY);
      }
    }
  };

  const onTouchEnd = (event: TouchEvent): void => {
    if (event.touches.length === 0) {
      isDragging = false;
      initialPinchDistance = 0;
    } else if (event.touches.length === 1) {
      // Pivot fallback safely back to active dragging anchor points
      const t0 = event.touches[0];
      if (t0) {
        isDragging = true;
        startX = t0.clientX - panX;
        startY = t0.clientY - panY;
      }
    }
  };

  // === Safe Keyboard Layout Interception Engine ===
  const isInputField = (element: EventTarget | null): boolean => {
    if (!(element instanceof HTMLElement)) return false;
    return (
      ["INPUT", "TEXTAREA"].includes(element.tagName) ||
      element.isContentEditable
    );
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (isInputField(e.target)) return;

    const actions: Record<string, () => void> = {
      h: flipVideo,
      "+": () => changeZoom(-1),
      "-": () => changeZoom(1),
      c: () => faster(video),
      x: () => resetSpeed(video),
      z: () => slower(video),
      b: () => setVolume(video, -0.1),
      n: () => setVolume(video, 0.1),
      m: () => toggleMute(video),
      v: () => (video.paused ? void video.play() : video.pause()),
      ",": () =>
        (video.currentTime = Math.max(0, video.currentTime - 1 / 12)),
      ".": () =>
        (video.currentTime = Math.min(
          video.duration,
          video.currentTime + 1 / 12
        )),
      r: () => {
        angle = (angle + 90) % 360;
        updateTransform();
      },
      "Shift+ArrowUp": () => setVolume(video, 0.1),
      "Shift+ArrowDown": () => setVolume(video, -0.1),
      "Ctrl+ArrowLeft": () =>
        (video.currentTime = Math.max(0, video.currentTime - 5)),
      "Ctrl+ArrowRight": () =>
        (video.currentTime = Math.min(
          video.duration,
          video.currentTime + 5
        )),
      "Alt+r": () => {
        angle = 0;
        updateTransform();
      }
    };

    const keyCombo: string = [
      e.ctrlKey ? "Ctrl" : "",
      e.shiftKey ? "Shift" : "",
      e.altKey ? "Alt" : "",
      e.metaKey ? "Meta" : "",
      e.key
    ]
      .filter(Boolean)
      .join("+");

    if (actions[keyCombo]) {
      // Fixed: Only intercept default execution if key matches map profiles
      e.preventDefault();
      actions[keyCombo]();
    }
  };

  window.addEventListener("keydown", onKeyDown);

  // === Progress Persistence Pipeline ===
  let onLoadedMetadata: (() => void) | null = null;
  let onEnded: (() => void) | null = null;

  if (videoid) {
    const postId: string = videoid;

    saveIntervalId = setInterval(() => {
      if (!video.paused && video.currentTime > 0) {
        localStorage.setItem(`videoProgress-${postId}`, video.currentTime.toString());
      }
    }, 5000);

    onLoadedMetadata = () => {
      const savedTime = localStorage.getItem(`videoProgress-${postId}`);
      if (savedTime) video.currentTime = parseFloat(savedTime);
    };

    onEnded = () => {
      localStorage.removeItem(`videoProgress-${postId}`);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
  }

  // Attach Event Listeners
  video.addEventListener("wheel", onWheel, { passive: false });
  video.addEventListener("mousedown", onMouseDown);
  video.addEventListener("mousemove", onMouseMove);
  video.addEventListener("mouseup", onMouseUp);
  video.addEventListener("mouseleave", onMouseUp);
  video.addEventListener("touchstart", onTouchStart, { passive: false });
  video.addEventListener("touchmove", onTouchMove, { passive: false });
  video.addEventListener("touchend", onTouchEnd);

  // Fixed: Expose teardown hook to eliminate background memory leaks
  return {
    destroy: (): void => {
      if (saveIntervalId) clearInterval(saveIntervalId);
      window.removeEventListener("keydown", onKeyDown);
      video.removeEventListener("wheel", onWheel);
      video.removeEventListener("mousedown", onMouseDown);
      video.removeEventListener("mousemove", onMouseMove);
      video.removeEventListener("mouseup", onMouseUp);
      video.removeEventListener("mouseleave", onMouseUp);
      video.removeEventListener("touchstart", onTouchStart);
      video.removeEventListener("touchmove", onTouchMove);
      video.removeEventListener("touchend", onTouchEnd);

      if (onLoadedMetadata) {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
      }
      if (onEnded) {
        video.removeEventListener("ended", onEnded);
      }
    }
  };
}

// === Support Functions ===
function setVolume(video: HTMLVideoElement, value: number): void {
  video.volume = Math.min(1, Math.max(0, video.volume + value));
}

function toggleMute(video: HTMLVideoElement, button: HTMLElement | null = null): void {
  video.muted = !video.muted;
  if (button) {
    button.textContent = video.muted ? "🔇" : "🔊";
  }
}

function resetSpeed(video: HTMLVideoElement): void {
  video.playbackRate = 1;
}

function slower(video: HTMLVideoElement): void {
  video.playbackRate = Math.max(0.25, video.playbackRate - 0.15);
}

function faster(video: HTMLVideoElement): void {
  video.playbackRate = Math.min(3.0, video.playbackRate + 0.15);
}

export {
  setupVideoUtilityFunctions,
  setVolume,
  toggleMute,
  resetSpeed,
  slower,
  faster
};