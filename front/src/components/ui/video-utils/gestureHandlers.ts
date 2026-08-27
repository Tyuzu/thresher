let isDragging: boolean = false;
let startX: number = 0;
let startY: number = 0;
let zoomLevel: number = 1;
let panX: number = 0;
let panY: number = 0;
let angle: number = 0;
let flip: boolean = false;

const minZoom: number = 1;
const maxZoom: number = 8;

const updateTransform = (video: HTMLVideoElement): void => {
  video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${
    flip ? "scaleX(-1)" : ""
  }`;
};

const constrainPan = (video: HTMLVideoElement): void => {
  const rect = video.getBoundingClientRect();
  const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
  const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
};

const changeZoom = (
  delta: number,
  event: MouseEvent | WheelEvent | null,
  video: HTMLVideoElement
): void => {
  const rect = video.getBoundingClientRect();
  const cursorX = event ? event.clientX - rect.left : rect.width / 2;
  const cursorY = event ? event.clientY - rect.top : rect.height / 2;
  const prevZoom = zoomLevel;

  zoomLevel *= delta > 0 ? 0.95 : 1.05;
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
  const zoomFactor = zoomLevel / prevZoom;

  panX -= (cursorX - rect.width / 2) * (zoomFactor - 1);
  panY -= (cursorY - rect.height / 2) * (zoomFactor - 1);
  constrainPan(video);
  updateTransform(video);
};

const flipVideo = (video: HTMLVideoElement): void => {
  flip = !flip;
  updateTransform(video);
};

const rotateVideo = (video: HTMLVideoElement, degrees: number = 90): void => {
  angle = (angle + degrees) % 360;
  video.style.width = "100vh";
  updateTransform(video);
};

const resetRotation = (video: HTMLVideoElement): void => {
  angle = 0;
  video.style.width = "";
  updateTransform(video);
};

function setupTouch(video: HTMLVideoElement): void {
  video.addEventListener(
    "touchstart",
    (event: TouchEvent) => {
      if (event.touches.length === 1) {
        isDragging = true;
        startX = (event.touches[0]?.clientX ?? startX) - panX;
        startY = (event.touches[0]?.clientY ?? startY) - panY;
      }
    },
    { passive: false }
  );

  video.addEventListener(
    "touchmove",
    (event: TouchEvent) => {
      if (!isDragging || event.touches.length !== 1) {
        return;
      }
      panX = (event.touches[0]?.clientX ?? startX) - startX;
      panY = (event.touches[0]?.clientY ?? startY) - startY;
      constrainPan(video);
      updateTransform(video);
    },
    { passive: false }
  );

  video.addEventListener("touchend", () => (isDragging = false));
}

export function setupGestures(video: HTMLVideoElement): void {
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    changeZoom(e.deltaY, e, video);
  };

  const onMouseDown = (e: MouseEvent): void => {
    if (zoomLevel === 1) {
      return;
    }
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    document.body.style.cursor = "grabbing";
  };

  const onMouseMove = (e: MouseEvent): void => {
    if (!isDragging) {
      return;
    }
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    constrainPan(video);
    updateTransform(video);
  };

  const onMouseUp = (): boolean => (isDragging = false);

  video.addEventListener("wheel", onWheel, { passive: false });
  video.addEventListener("mousedown", onMouseDown);
  video.addEventListener("mousemove", onMouseMove);
  video.addEventListener("mouseup", onMouseUp);
  video.addEventListener("mouseleave", onMouseUp);

  setupTouch(video);
}

export {
  changeZoom,
  updateTransform,
  flipVideo,
  rotateVideo,
  resetRotation,
  constrainPan,
};

// --- Encapsulated Factory Implementation ---

export interface VideoManipulator {
  flip: () => void;
  rotate: (degrees?: number) => void;
  reset: () => void;
  destroy: () => void;
}

export function createVideoManipulator(
  video: HTMLVideoElement
): VideoManipulator {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let angle = 0;
  let flip = false;

  const minZoom = 1;
  const maxZoom = 8;

  const updateTransform = (): void => {
    video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${
      flip ? "scaleX(-1)" : ""
    }`;
  };

  const constrainPan = (rect: { width: number; height: number }): void => {
    const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
    const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

    panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
    panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
  };

  const changeZoom = (
    delta: number,
    event?: MouseEvent | WheelEvent
  ): void => {
    const rect = video.getBoundingClientRect();
    const cursorX = event ? event.clientX - rect.left : rect.width / 2;
    const cursorY = event ? event.clientY - rect.top : rect.height / 2;
    const prevZoom = zoomLevel;

    zoomLevel *= delta > 0 ? 0.95 : 1.05;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
    const zoomFactor = zoomLevel / prevZoom;

    panX -= (cursorX - rect.width / 2) * (zoomFactor - 1);
    panY -= (cursorY - rect.height / 2) * (zoomFactor - 1);

    constrainPan(rect);
    updateTransform();
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    changeZoom(e.deltaY, e);
  };

  const onMouseDown = (e: MouseEvent): void => {
    if (zoomLevel === 1) return;
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    video.style.cursor = "grabbing";
  };

  const onMouseMove = (e: MouseEvent): void => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;

    constrainPan({ width: video.offsetWidth, height: video.offsetHeight });
    updateTransform();
  };

  const onMouseUp = (): void => {
    isDragging = false;
    video.style.cursor = zoomLevel > 1 ? "grab" : "default";
  };

  const onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1 && zoomLevel > 1) {
      isDragging = true;
      startX = (e.touches[0]?.clientX ?? startX) - panX;
      startY = (e.touches[0]?.clientY ?? startY) - panY;
    }
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (!isDragging || e.touches.length !== 1) return;
    panX = (e.touches[0]?.clientX ?? startX) - startX;
    panY = (e.touches[0]?.clientY ?? startY) - startY;
    constrainPan({ width: video.offsetWidth, height: video.offsetHeight });
    updateTransform();
  };

  video.addEventListener("wheel", onWheel, { passive: false });
  video.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  video.addEventListener("touchstart", onTouchStart, { passive: true });
  video.addEventListener("touchmove", onTouchMove, { passive: false });
  video.addEventListener("touchend", onMouseUp);

  video.style.transformOrigin = "center center";

  return {
    flip() {
      flip = !flip;
      updateTransform();
    },
    rotate(degrees = 90) {
      angle = (angle + degrees) % 360;
      updateTransform();
    },
    reset() {
      zoomLevel = 1;
      panX = 0;
      panY = 0;
      angle = 0;
      flip = false;
      video.style.cursor = "default";
      updateTransform();
    },
    destroy() {
      video.removeEventListener("wheel", onWheel);
      video.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      video.removeEventListener("touchstart", onTouchStart);
      video.removeEventListener("touchmove", onTouchMove);
      video.removeEventListener("touchend", onMouseUp);
    },
  };
}