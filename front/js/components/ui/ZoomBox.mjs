import {
    createOverlay,
    createImageElement,
    createVideoElement,
    applyDarkMode,
    preloadImages,
    updateTransform,
    smoothZoom,
    handleMouseDown,
    createNavigationButtons,
    createCloseButton,
    createZoomButtons,
    handleKeyboard
} from "./zoomboxHelpers.js";
import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";

// Detect media type by file extension
function getMediaType(src) {
    const lower = src.toLowerCase();
    if (/\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower)) {
        return "video";
    }
    return "image";
}

// Main ZoomBox factory
const ZoomBox = (mediaItems, initialIndex = 0) => {
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
        return;
    }
    if (document.getElementById("zoombox")) {
        return;
    }

    const state = {
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

    // --- Base DOM Shell Preparation ---
    const zoombox = createOverlay();
    zoombox.id = "zoombox";
    zoombox.setAttribute("role", "dialog");
    zoombox.setAttribute("aria-modal", "true");
    applyDarkMode(zoombox);

    const content = document.createElement("div");
    content.setAttribute("data-zoombox-content", "");
    content.setAttribute("tabindex", "-1");
    content.style.outline = "none";
    zoombox.appendChild(content);

    let zoomButtonsContainer = null;

    // --- Close logic (defined early so renderMedia and closeBtn can use it) ---
    const closeZoomBox = () => {
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
    content.appendChild(closeBtn);

    // --- Media renderer ---
    const renderMedia = (index) => {
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

        const element = type === "video"
            ? createVideoElement(src)
            : createImageElement(src);

        // 3. Setup interactions (Images only)
        if (type === "image") {
            const onWheel = (e) => smoothZoom(e, element, state, zoombox);
            const onDown = (e) => handleMouseDown(e, state, element);

            element.addEventListener("wheel", onWheel, { passive: false });
            element.addEventListener("mousedown", onDown);

            element._cleanupListeners = () => {
                element.removeEventListener("wheel", onWheel);
                element.removeEventListener("mousedown", onDown);
            };

            preloadImages(mediaItems, index);

            // Dynamically inject zoom UI only when viewing an image
            zoomButtonsContainer = createZoomButtons(element, state, zoombox);
            zoombox.appendChild(zoomButtonsContainer);
        }

        // 4. Insert before the close button to keep DOM ordering clean
        content.insertBefore(element, closeBtn);
        state.currentMedia = element;

        dispatchZoomBoxEvent("mediachange", { index, src, type });
    };

    // --- Run Initial Render via the unified renderMedia ---
    renderMedia(state.currentIndex);

    // --- Navigation controls ---
    if (mediaItems.length > 1) {
        const [prevBtn, nextBtn] = createNavigationButtons(
            mediaItems,
            state.currentMedia,
            state,
            preloadImages,
            updateTransform,
            renderMedia
        );
        content.appendChild(prevBtn);
        content.appendChild(nextBtn);
    }

    // --- Mount safely ---
    const mountPoint = document.getElementById("app") || document.body;
    mountPoint.appendChild(zoombox);

    // --- Keyboard handling ---
    const onKeyDown = (e) => {
        if (e.key === "Escape") {
            closeZoomBox();
        } else {
            handleKeyboard(
                e,
                mediaItems,
                state.currentMedia,
                state,
                preloadImages,
                updateTransform,
                closeZoomBox,
                renderMedia
            );
        }
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