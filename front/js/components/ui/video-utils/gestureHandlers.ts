let isDragging = false, startX = 0, startY = 0;
let zoomLevel = 1, panX = 0, panY = 0, angle = 0, flip = false;
const minZoom = 1, maxZoom = 8;

const updateTransform = (video) => {
  video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${flip ? "scaleX(-1)" : ""}`;
};

const changeZoom = (delta, event, video) => {
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

const constrainPan = (video) => {
  const rect = video.getBoundingClientRect();
  const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
  const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
};

const flipVideo = (video) => {
  flip = !flip;
  updateTransform(video);
};

const rotateVideo = (video, degrees = 90) => {
  angle = (angle + degrees) % 360;
  video.style.width = "100vh";
  updateTransform(video);
};

const resetRotation = (video) => {
  angle = 0;
  video.style.width = "";
  updateTransform(video);
};

export {
  changeZoom,
  updateTransform,
  flipVideo,
  rotateVideo,
  resetRotation,
  constrainPan,
};

export function setupGestures(video) {
  const onWheel = (e) => {
    e.preventDefault();
    changeZoom(e.deltaY, e, video);
  };

  const onMouseDown = (e) => {
    if (zoomLevel === 1) {
return;
} // nothing to drag at scale 1
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - panX;  // use global panX
    startY = e.clientY - panY;  // use global panY
    document.body.style.cursor = "grabbing";
  };

  const onMouseMove = (e) => {
    if (!isDragging) {
return;
}
    panX = e.clientX - startX;  // update global panX
    panY = e.clientY - startY;  // update global panY
    constrainPan(video);
    updateTransform(video);
  };

  const onMouseUp = () => isDragging = false;

  video.addEventListener("wheel", onWheel, { passive: false });
  video.addEventListener("mousedown", onMouseDown);
  video.addEventListener("mousemove", onMouseMove);
  video.addEventListener("mouseup", onMouseUp);
  video.addEventListener("mouseleave", onMouseUp);

  setupTouch(video);
}

function setupTouch(video) {
  video.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
      isDragging = true;
      startX = event.touches[0].clientX - panX; // use global
      startY = event.touches[0].clientY - panY;
    }
  }, { passive: false });

  video.addEventListener("touchmove", (event) => {
    if (!isDragging || event.touches.length !== 1) {
return;
}
    panX = event.touches[0].clientX - startX;
    panY = event.touches[0].clientY - startY;
    constrainPan(video);
    updateTransform(video);
  }, { passive: false });

  video.addEventListener("touchend", () => isDragging = false);
}
/*
export function createVideoManipulator(video) {
  // Private sandbox state isolated exclusively to this specific video instance
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

  const updateTransform = () => {
    // scaleX(-1) placed safely at the end avoids invert-panning bugs
    video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${
      flip ? "scaleX(-1)" : ""
    }`;
  };

  const constrainPan = (rect) => {
    // Use pre-calculated dimensions passed down to prevent layout thrashing
    const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
    const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

    panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
    panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
  };

  const changeZoom = (delta, event) => {
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

  // --- Interaction Event Listeners ---
  const onWheel = (e) => {
    e.preventDefault();
    changeZoom(e.deltaY, e);
  };

  const onMouseDown = (e) => {
    if (zoomLevel === 1) return; 
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    video.style.cursor = "grabbing";
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    
    // Pass bounding dimensions smoothly without re-triggering style updates
    constrainPan({ width: video.offsetWidth, height: video.offsetHeight });
    updateTransform();
  };

  const onMouseUp = () => {
    isDragging = false;
    video.style.cursor = zoomLevel > 1 ? "grab" : "default";
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 1 && zoomLevel > 1) {
      isDragging = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    }
  };

  const onTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    panX = e.touches[0].clientX - startX;
    panY = e.touches[0].clientY - startY;
    constrainPan({ width: video.offsetWidth, height: video.offsetHeight });
    updateTransform();
  };

  // --- Attach Bindings ---
  video.addEventListener("wheel", onWheel, { passive: false });
  video.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove); // Bound globally for cleaner drag-off-element physics
  window.addEventListener("mouseup", onMouseUp);
  video.addEventListener("touchstart", onTouchStart, { passive: true });
  video.addEventListener("touchmove", onTouchMove, { passive: false });
  video.addEventListener("touchend", onMouseUp);

  // Initial cursor setup indicating drag availability
  video.style.transformOrigin = "center center";

  // Public Interface controls returned to control the specific instance
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
      // Complete teardown API protecting against heavy system memory leaks
      video.removeEventListener("wheel", onWheel);
      video.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      video.removeEventListener("touchstart", onTouchStart);
      video.removeEventListener("touchmove", onTouchMove);
      video.removeEventListener("touchend", onMouseUp);
    }
  };
}*/