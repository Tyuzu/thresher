import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";
import Imagex from "../base/Imagex.js";

/* =========================
   Basic UI Creation Functions
   ========================= */

export const createOverlay = () => {
    const el = document.createElement("div");
    el.className = "zoombox-overlay";
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s ease";
    return el;
};

export const createImageElement = (src) => {
    const img = Imagex({ src: src });
    img.alt = "ZoomBox Image";
    img.style.transition = "transform 0.2s ease-out";
    img.style.willChange = "transform";
    img.style.transformOrigin = "50% 50%"; // Kept fixed to isolate panning math
    return img;
};

export const applyDarkMode = (el) => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
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
    if (!img) return;
    const transformStr = `translate(${state.panX || 0}px, ${state.panY || 0}px) scale(${state.zoomLevel || 1}) rotate(${state.angle || 0}deg) ${state.flip ? "scaleX(-1)" : ""}`;
    img.style.transform = transformStr;
};

export const smoothZoom = (event, img, state) => {
    if (!img) return;
    event.preventDefault();
    
    const naturalW = img.naturalWidth || img.width || 800;
    const naturalH = img.naturalHeight || img.height || 600;
    const prevZoom = state.zoomLevel || 1;

    // Adjust zoom coefficient factor safely
    state.zoomLevel *= event.deltaY > 0 ? 0.9 : 1.1;
    state.zoomLevel = Math.max(1, Math.min(state.zoomLevel, Math.max(naturalW / (img.width || 1), naturalH / (img.height || 1), 12)));

    const rect = img.getBoundingClientRect();
    
    // Track zoom focus exactly relative to the center pivot point matrix
    const cursorX = event.clientX;
    const cursorY = event.clientY;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = cursorX - centerX;
    const offsetY = cursorY - centerY;
    const zoomFactor = state.zoomLevel / prevZoom;

    state.panX = (state.panX || 0) - offsetX * (zoomFactor - 1);
    state.panY = (state.panY || 0) - offsetY * (zoomFactor - 1);

    // Dynamic Viewport clamp algorithms
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const imgWidth = (img.offsetWidth || rect.width) * state.zoomLevel;
    const imgHeight = (img.offsetHeight || rect.height) * state.zoomLevel;

    const maxPanX = Math.max(0, (imgWidth - viewWidth) / 2);
    const maxPanY = Math.max(0, (imgHeight - viewHeight) / 2);

    state.panX = Math.min(maxPanX, Math.max(-maxPanX, state.panX));
    state.panY = Math.min(maxPanY, Math.max(-maxPanY, state.panY));

    updateTransform(img, state);
    dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
};

/* =========================
   Mouse & Touch Handling
   ========================= */

export const handleMouseDown = (e, state) => {
    if ((state.zoomLevel || 1) <= 1) return;
    state.isDragging = true;
    state.startX = e.clientX - (state.panX || 0);
    state.startY = e.clientY - (state.panY || 0);
    state.velocityX = 0;
    state.velocityY = 0;
};

export const handleMouseMove = (e, state, img) => {
    if (!state.isDragging) return;
    e.preventDefault();
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    state.velocityX = dx - (state.panX || 0);
    state.velocityY = dy - (state.panY || 0);
    state.panX = dx;
    state.panY = dy;
    updateTransform(img, state);
};

export const handleMouseUp = (state, img) => {
    if (!state.isDragging) return;
    state.isDragging = false;
    
    const animate = () => {
        state.panX += (state.velocityX || 0) * 0.95;
        state.panY += (state.velocityY || 0) * 0.95;
        state.velocityX *= 0.9;
        state.velocityY *= 0.9;
        updateTransform(img, state);
        
        if (Math.abs(state.velocityX) > 0.1 || Math.abs(state.velocityY) > 0.1) {
            requestAnimationFrame(animate);
        }
    };
    animate();
};

export const handleTouchStart = (e, state, img) => {
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
            e.preventDefault();
        }
        state.lastTap = now;
        state.isDragging = true;
        state.startX = e.touches[0].clientX - (state.panX || 0);
        state.startY = e.touches[0].clientY - (state.panY || 0);
    }
};

export const handleTouchMove = (e, state, img) => {
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

        state.panX -= (midX - (state.panX || 0)) * (zoomFactor - 1);
        state.panY -= (midY - (state.panY || 0)) * (zoomFactor - 1);

        updateTransform(img, state);
    }
};

export const handleTouchEnd = (e, state, img) => {
    if (e.touches.length < 2) {
        state.initialPinchDistance = null;
    }
    if (!e.touches.length) {
        handleMouseUp(state, img);
    }
};

/* =========================
   Navigation & Controls
   ========================= */

const resetTransformState = (state) => {
    state.zoomLevel = 1;
    state.panX = 0;
    state.panY = 0;
    state.angle = 0;
    state.flip = false;
};

export const createNavigationButtons = (images, img, state, preload, update, renderMedia) => {
    const prev = document.createElement("button");
    prev.className = "zoombox-prev-btn";
    prev.textContent = "⮘";
    prev.onclick = () => {
        state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
        resetTransformState(state);
        renderMedia(state.currentIndex);
    };

    const next = document.createElement("button");
    next.className = "zoombox-next-btn";
    next.textContent = "⮚";
    next.onclick = () => {
        state.currentIndex = (state.currentIndex + 1) % images.length;
        resetTransformState(state);
        renderMedia(state.currentIndex);
    };

    return [prev, next];
};

export const createCloseButton = (closeFn) => {
    const btn = document.createElement("button");
    btn.className = "zoombox-close-btn";
    btn.textContent = "✖";
    btn.onclick = closeFn;
    return btn;
};

export const handleKeyboard = (e, images, img, state, preload, update, close, renderMedia) => {
    const prevZoom = state.zoomLevel || 1;
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
            state.zoomLevel = Math.min(3, prevZoom * 1.1);
            state.panX *= state.zoomLevel / prevZoom;
            state.panY *= state.zoomLevel / prevZoom;
            update(img, state);
            break;
        case "-":
            state.zoomLevel = Math.max(1, prevZoom / 1.1);
            state.panX *= state.zoomLevel / prevZoom;
            state.panY *= state.zoomLevel / prevZoom;
            update(img, state);
            break;
        case "r":
            state.angle = ((state.angle || 0) + 90) % 360;
            update(img, state);
            break;
        case "h":
            state.flip = !state.flip;
            update(img, state);
            break;
        case "Escape":
            close();
            break;
    }
};