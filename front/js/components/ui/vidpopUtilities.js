/**
 * Advanced Video Utility Management Module
 * Implements performance-optimized zoom, pan, transformation, and hotkey listeners.
 */
function setupVideoUtilityFunctions(video, videoid) {
    if (!video) return null;

    const container = video.parentElement || document.body;

    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark-mode");
    }

    let zoomLevel = 1;
    let panX = 0, panY = 0;
    let angle = 0, flip = false;
    const minZoom = 1, maxZoom = 8;
    
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialPinchDistance = 0;
    let initialPinchZoom = 1;

    let saveIntervalId = null;

    // Fixed: Performance rendering pipeline avoiding debounce latency
    const updateTransform = () => {
        video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${flip ? "scaleX(-1)" : ""}`;
        if (zoomLevel === 1) {
            video.style.transition = "transform 0.2s ease";
        } else {
            video.style.transition = "none";
        }
    };

    const constrainPan = () => {
        const rect = video.getBoundingClientRect();
        const maxPanX = Math.max(0, (rect.width * (zoomLevel - 1)) / 2);
        const maxPanY = Math.max(0, (rect.height * (zoomLevel - 1)) / 2);

        panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
        panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
    };

    const changeZoom = (delta, event) => {
        const rect = video.getBoundingClientRect();
        const cursorX = event ? event.clientX - rect.left : rect.width / 2;
        const cursorY = event ? event.clientY - rect.top : rect.height / 2;

        const prevZoom = zoomLevel;
        zoomLevel *= delta > 0 ? 0.92 : 1.08; 
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));

        const zoomFactor = zoomLevel / prevZoom;

        // Anchor offsets directly against coordinate interaction origins
        panX -= (cursorX - rect.width / 2) * (zoomFactor - 1);
        panY -= (cursorY - rect.height / 2) * (zoomFactor - 1);

        constrainPan();
        updateTransform();
    };

    const onWheel = (event) => {
        event.preventDefault();
        changeZoom(event.deltaY, event);
    };

    const flipVideo = () => {
        flip = !flip;
        updateTransform();
    };

    // === Unified Unified Drag / Pointer Interactions ===
    const handleDragStart = (clientX, clientY) => {
        if (zoomLevel <= 1) return;
        isDragging = true;
        startX = clientX - panX;
        startY = clientY - panY;
    };

    const handleDragMove = (clientX, clientY) => {
        if (!isDragging) return;
        panX = clientX - startX;
        panY = clientY - startY;
        constrainPan();
        updateTransform();
    };

    const onMouseDown = (event) => {
        if (zoomLevel <= 1) return;
        event.preventDefault();
        handleDragStart(event.clientX, event.clientY);
    };

    const onMouseMove = (event) => {
        handleDragMove(event.clientX, event.clientY);
    };

    const onMouseUp = () => {
        isDragging = false;
    };

    // === Unified Multi-Touch Lifecycle Engine ===
    const onTouchStart = (event) => {
        if (event.touches.length === 2) {
            event.preventDefault();
            isDragging = false; // Override drag with pinch mechanics
            initialPinchDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            initialPinchZoom = zoomLevel;
        } else if (event.touches.length === 1) {
            handleDragStart(event.touches[0].clientX, event.touches[0].clientY);
        }
    };

    const onTouchMove = (event) => {
        if (event.touches.length === 2) {
            event.preventDefault();
            const currentDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            if (initialPinchDistance === 0) return;
            
            const scaleFactor = currentDistance / initialPinchDistance;
            zoomLevel = Math.max(minZoom, Math.min(maxZoom, initialPinchZoom * scaleFactor));
            constrainPan();
            updateTransform();
        } else if (event.touches.length === 1 && isDragging) {
            handleDragMove(event.touches[0].clientX, event.touches[0].clientY);
        }
    };

    const onTouchEnd = (event) => {
        if (event.touches.length === 0) {
            isDragging = false;
            initialPinchDistance = 0;
        } else if (event.touches.length === 1) {
            // Pivot fallback safely back to active dragging anchor points
            isDragging = true;
            startX = event.touches[0].clientX - panX;
            startY = event.touches[0].clientY - panY;
        }
    };

    // === Safe Keyboard Layout Interception Engine ===
    const isInputField = (element) => ["INPUT", "TEXTAREA"].includes(element.tagName) || element.isContentEditable;

    const onKeyDown = (e) => {
        if (isInputField(e.target)) return;

        const actions = {
            "h": flipVideo,
            "+": () => changeZoom(-1),
            "-": () => changeZoom(1),
            "c": () => faster(video),
            "x": () => resetSpeed(video),
            "z": () => slower(video),
            "b": () => setVolume(video, -0.1),
            "n": () => setVolume(video, 0.1),
            "m": () => toggleMute(video),
            "v": () => video.paused ? video.play() : video.pause(),
            ",": () => video.currentTime = Math.max(0, video.currentTime - 1 / 12),
            ".": () => video.currentTime = Math.min(video.duration, video.currentTime + 1 / 12),
            "r": () => {
                angle = (angle + 90) % 360;
                updateTransform();
            },
            "Shift+ArrowUp": () => setVolume(video, 0.1),
            "Shift+ArrowDown": () => setVolume(video, -0.1),
            "Ctrl+ArrowLeft": () => video.currentTime = Math.max(0, video.currentTime - 5),
            "Ctrl+ArrowRight": () => video.currentTime = Math.min(video.duration, video.currentTime + 5),
            "Alt+r": () => {
                angle = 0; 
                updateTransform();
            }
        };

        const keyCombo = [
            e.ctrlKey ? "Ctrl" : "",
            e.shiftKey ? "Shift" : "",
            e.altKey ? "Alt" : "",
            e.metaKey ? "Meta" : "",
            e.key,
        ].filter(Boolean).join("+");

        if (actions[keyCombo]) {
            // Fixed: Only intercept default execution if key matches map profiles
            e.preventDefault();
            actions[keyCombo]();
        }
    };

    window.addEventListener("keydown", onKeyDown);

    // === Progress Persistence Pipeline ===
    if (videoid) {
        const postId = videoid;

        saveIntervalId = setInterval(() => {
            if (!video.paused && video.currentTime > 0) {
                localStorage.setItem(`videoProgress-${postId}`, video.currentTime);
            }
        }, 5000);

        video.addEventListener("loadedmetadata", () => {
            const savedTime = localStorage.getItem(`videoProgress-${postId}`);
            if (savedTime) video.currentTime = parseFloat(savedTime);
        });

        video.addEventListener("ended", () => {
            localStorage.removeItem(`videoProgress-${postId}`);
        });
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
        destroy: () => {
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
        }
    };
}

// === Support Functions ===
function setVolume(video, value) {
    video.volume = Math.min(1, Math.max(0, video.volume + value));
}

function toggleMute(video, button = null) {
    video.muted = !video.muted;
    if (button) {
        button.textContent = video.muted ? "🔇" : "🔊";
    }
}

function resetSpeed(video) {
    video.playbackRate = 1;
}

function slower(video) {
    video.playbackRate = Math.max(0.25, video.playbackRate - 0.15);
}

function faster(video) {
    video.playbackRate = Math.min(3.0, video.playbackRate + 0.15);
}

export { setupVideoUtilityFunctions };