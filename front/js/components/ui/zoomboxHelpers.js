import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";
import Imagex from "../base/Imagex.js";
import { createElement } from "../createElement.js";

/* =========================
   Basic UI Creation Functions
   ========================= */

export const createOverlay = () => {
    return createElement("div", {
        class: "zoombox-overlay",
        style: {
            opacity: "0",
            transition: "opacity 0.3s ease"
        }
    });
};

export const createImageElement = (src, stateRef) => {
    const img = Imagex({ src });
    img.alt = "ZoomBox Image";
    img.style.transition = "transform 0.15s ease-out";
    img.style.willChange = "transform";
    img.style.transformOrigin = "50% 50%";
    img._stateRef = stateRef;

    // Attach touch listeners using function hoisting safely
    img.addEventListener("touchstart", (e) => handleTouchStart(e, img._stateRef, img), { passive: false });
    img.addEventListener("touchmove", (e) => handleTouchMove(e, img._stateRef, img), { passive: false });
    img.addEventListener("touchend", (e) => handleTouchEnd(e, img._stateRef));

    return img;
};

export function createVideoElement(src) {
    return createElement("video", {
        src,
        controls: true,
        autoplay: true,
        style: {
            maxWidth: "90%",
            maxHeight: "90%",
            borderRadius: "6px"
        }
    });
}

export const applyDarkMode = (el) => {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        el.classList.add("dark-mode");
    }
};

export const preloadImages = (images, index) => {
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

/* =========================
   Transformation & Zoom Logic
   ========================= */

export const updateTransform = (img, state) => {
    if (!img || !state) return;
    img.style.transformOrigin = "50% 50%";
    
    const transforms = [
        `translate(${state.panX || 0}px, ${state.panY || 0}px)`,
        `rotate(${state.angle || 0}deg)`,
        state.flip ? "scaleX(-1)" : "",
        `scale(${state.zoomLevel || 1})`
    ].filter(Boolean).join(" ");

    img.style.transform = transforms;
    updateCursor(img, state);
};

export const updateCursor = (img, state) => {
    if (!img) return;
    if (state.zoomLevel > 1) {
        img.style.cursor = state.isDragging ? "grabbing" : "grab";
    } else {
        img.style.cursor = "auto";
    }
};

let zoomIndicatorTimeout;
export const showZoomIndicator = (container, zoomLevel) => {
    if (!container) return;
    let indicator = container.querySelector(".zoombox-zoom-indicator");
    if (!indicator) {
        indicator = createElement("div", { class: "zoombox-zoom-indicator" });
        container.appendChild(indicator);
    }
    indicator.textContent = `${Math.round(zoomLevel * 100)}%`;
    indicator.style.opacity = "1";
    
    clearTimeout(zoomIndicatorTimeout);
    zoomIndicatorTimeout = setTimeout(() => {
        indicator.style.opacity = "0";
    }, 1000);
};

export const showZoomLimitFeedback = (container, limitType) => {
    if (!container) return;
    const text = limitType === "min" ? "Minimum Zoom Reached" : "Maximum Zoom Reached";
    
    const feedback = createElement("div", {
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
    }, [text]);

    container.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1000);
};

export const smoothZoom = (event, img, state, container) => {
    if (!img || !state) return;
    if (event.preventDefault) event.preventDefault();

    const naturalW = img.naturalWidth || img.width || 800;
    const naturalH = img.naturalHeight || img.height || 600;
    const prevZoom = state.zoomLevel || 1;

    let targetZoom = state.zoomLevel * (event.deltaY > 0 ? 0.9 : 1.1);
    const maxZoom = Math.max(naturalW / (img.width || 1), naturalH / (img.height || 1), 16);
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

export function handleMouseDown(e, state, img) {
    if (!state || state.zoomLevel <= 1) return;
    e.preventDefault();

    state.isDragging = true;
    state.startX = e.clientX - (state.panX || 0);
    state.startY = e.clientY - (state.panY || 0);
    state.velocityX = 0;
    state.velocityY = 0;
    img.style.cursor = "grabbing";

    const onMove = (moveEvent) => {
        if (!state.isDragging) return;
        moveEvent.preventDefault();
        const dx = moveEvent.clientX - state.startX;
        const dy = moveEvent.clientY - state.startY;
        state.velocityX = dx - (state.panX || 0);
        state.velocityY = dy - (state.panY || 0);
        state.panX = dx;
        state.panY = dy;
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
            const maxPanX = (imgWidth - viewWidth) / 2;
            const maxPanY = (imgHeight - viewHeight) / 2;

            state.panX += (state.velocityX || 0) * 0.95;
            state.panY += (state.velocityY || 0) * 0.95;

            if (Math.abs(state.panX) > maxPanX) state.velocityX *= 0.8;
            if (Math.abs(state.panY) > maxPanY) state.velocityY *= 0.8;

            state.velocityX *= 0.9;
            state.velocityY *= 0.9;
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

export function handleTouchStart(e, state, img) {
    if (!state) return;
    if (e.touches.length === 2) {
        state.initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        state.initialZoom = state.zoomLevel || 1;
    } else if (e.touches.length === 1) {
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
        state.startX = e.touches[0].clientX - (state.panX || 0);
        state.startY = e.touches[0].clientY - (state.panY || 0);
    }
}

export function handleTouchMove(e, state, img) {
    if (!state || !img) return;
    const container = img.closest(".gta-map-viewport") || img.parentElement;

    if (e.touches.length === 2 && state.initialPinchDistance) {
        const newDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const prevZoom = state.zoomLevel || 1;
        const scaleFactor = newDistance / state.initialPinchDistance;
        state.zoomLevel = Math.max(1, Math.min(3, state.initialZoom * scaleFactor));

        const rect = img.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const zoomFactor = state.zoomLevel / prevZoom;

        state.panX = (state.panX || 0) - (midX - (state.panX || 0)) * (zoomFactor - 1);
        state.panY = (state.panY || 0) - (midY - (state.panY || 0)) * (zoomFactor - 1);

        updateTransform(img, state);
        showZoomIndicator(container, state.zoomLevel);
        dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
    }
}

export function handleTouchEnd(e, state) {
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

export const createNavigationButtons = (images, state, renderMedia) => {
    const prev = createElement("button", {
        class: "zoombox-prev-btn",
        events: {
            click: () => {
                state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
                resetTransformState(state);
                renderMedia(state.currentIndex);
            }
        }
    }, ["⮘"]);

    const next = createElement("button", {
        class: "zoombox-next-btn",
        events: {
            click: () => {
                state.currentIndex = (state.currentIndex + 1) % images.length;
                resetTransformState(state);
                renderMedia(state.currentIndex);
            }
        }
    }, ["⮚"]);

    return [prev, next];
};

export const createCloseButton = (closeFn) => {
    return createElement("button", {
        class: "zoombox-close-btn",
        events: {
            click: () => closeFn()
        }
    }, ["✖"]);
};

export const createZoomButtons = (img, state, container) => {
    if (img) img._stateRef = state;

    const zoomInBtn = createElement("button", {
        events: {
            click: () => {
                smoothZoom({
                    deltaY: -1,
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2
                }, img, state, container);
            }
        }
    }, ["+"]);

    const zoomOutBtn = createElement("button", {
        events: {
            click: () => {
                smoothZoom({
                    deltaY: 1,
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2
                }, img, state, container);
            }
        }
    }, ["–"]);

    return createElement("div", {
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
    }, [zoomInBtn, zoomOutBtn]);
};

/* =========================
   Utility Functions
   ========================= */

export const resetTransformState = (state) => {
    if (!state) return;
    state.zoomLevel = 1;
    state.panX = 0;
    state.panY = 0;
    state.angle = 0;
    state.flip = false;
};

export const handleKeyboard = (e, images, img, state, container, closeFn, renderMedia) => {
    if (!state) return;

    switch (e.key) {
        case "ArrowRight":
            state.currentIndex = (state.currentIndex + 1) % images.length;
            resetTransformState(state);
            renderMedia(state.currentIndex);
            break;
        case "ArrowLeft":
            state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
            resetTransformState(state);
            renderMedia(state.currentIndex);
            break;
        case "+":
            smoothZoom({
                deltaY: -1,
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            }, img, state, container);
            break;
        case "-":
            smoothZoom({
                deltaY: 1,
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            }, img, state, container);
            break;
        case "r":
            state.angle = ((state.angle || 0) + 90) % 360;
            updateTransform(img, state);
            dispatchZoomBoxEvent("rotate", { angle: state.angle });
            break;
        case "h":
            state.flip = !state.flip;
            updateTransform(img, state);
            dispatchZoomBoxEvent("flip", { flip: state.flip });
            break;
        case "Escape":
            closeFn();
            break;
    }
};