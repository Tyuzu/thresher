import {
    updateTransform,
    resetTransformState
} from "../../components/ui/zoomBox/zoomboxHelpers.js";
import type { ZoomBoxState as SharedZoomBoxState } from "../../components/ui/zoomBox/zoomBoxTypes.js";
import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";

// ---------- Interfaces ----------

export interface ZoomBoxState extends SharedZoomBoxState {
    isDragging: boolean;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    currentIndex: number;
    lastPointerX?: number;
    lastPointerY?: number;
}

// ---------- Pointer Handlers ----------

/**
 * Standalone pointer move handler for panning zoomed images
 * @param e - Browser pointermove event
 * @param state - The ZoomBox transform state object
 * @param img - Target image element
 */
export function handlePointerMove(e: PointerEvent, state: ZoomBoxState, img: HTMLElement): void {
    if (!state || !state.isDragging || state.zoomLevel <= 1 || !img) return;
    
    e.preventDefault();

    // Calculate delta relative to last pointer position
    const currentX = e.clientX;
    const currentY = e.clientY;

    if (state.lastPointerX !== undefined && state.lastPointerY !== undefined) {
        state.velocityX = currentX - state.lastPointerX;
        state.velocityY = currentY - state.lastPointerY;
    }

    state.lastPointerX = currentX;
    state.lastPointerY = currentY;

    // Update pan position based on start offsets
    state.panX = currentX - state.startX;
    state.panY = currentY - state.startY;

    // Boundary check during active dragging to prevent offscreen movement
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const imgWidth = (img.offsetWidth || img.getBoundingClientRect().width);
    const imgHeight = (img.offsetHeight || img.getBoundingClientRect().height);
    
    const maxPanX = Math.max(0, (imgWidth * state.zoomLevel - viewWidth) / 2);
    const maxPanY = Math.max(0, (imgHeight * state.zoomLevel - viewHeight) / 2);

    state.panX = Math.min(maxPanX, Math.max(-maxPanX, state.panX));
    state.panY = Math.min(maxPanY, Math.max(-maxPanY, state.panY));

    updateTransform(img, state);
    dispatchZoomBoxEvent("pan", { panX: state.panX, panY: state.panY });
}

/**
 * Ends dragging state, releases pointer capture, and triggers smooth inertia animation.
 * @param e - Browser pointerup/pointercancel event
 * @param state - The ZoomBox transform state object
 * @param img - Target image element
 */
export function handlePointerUp(e: PointerEvent, state: ZoomBoxState, img: HTMLElement): void {
    if (!state || !state.isDragging || !img) return;

    // Release pointer capture if active target holds it
    const target = e.target as HTMLElement | null;
    if (target && typeof target.releasePointerCapture === "function" && target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
    }

    state.isDragging = false;
    img.style.cursor = state.zoomLevel > 1 ? "grab" : "auto";

    // Clean up temporary tracking markers
    delete state.lastPointerX;
    delete state.lastPointerY;

    // Inertia physics loop
    const animateInertia = () => {
        // Stop animating if user starts dragging again or resets state
        if (state.isDragging) return;

        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const imgWidth = (img.offsetWidth || img.getBoundingClientRect().width) * state.zoomLevel;
        const imgHeight = (img.offsetHeight || img.getBoundingClientRect().height) * state.zoomLevel;

        const maxPanX = Math.max(0, (imgWidth - viewWidth) / 2);
        const maxPanY = Math.max(0, (imgHeight - viewHeight) / 2);

        // Apply velocity decay
        state.panX = (state.panX || 0) + (state.velocityX || 0);
        state.panY = (state.panY || 0) + (state.velocityY || 0);

        // Clamp inside visible bounds
        state.panX = Math.min(maxPanX, Math.max(-maxPanX, state.panX));
        state.panY = Math.min(maxPanY, Math.max(-maxPanY, state.panY));

        // Friction dampening
        state.velocityX = (state.velocityX || 0) * 0.9;
        state.velocityY = (state.velocityY || 0) * 0.9;

        updateTransform(img, state);

        // Continue animation frame until momentum slows below threshold
        if (Math.abs(state.velocityX) > 0.1 || Math.abs(state.velocityY) > 0.1) {
            requestAnimationFrame(animateInertia);
        } else {
            state.velocityX = 0;
            state.velocityY = 0;
            dispatchZoomBoxEvent("pan-end", { panX: state.panX, panY: state.panY });
        }
    };

    requestAnimationFrame(animateInertia);
}

/**
 * Initiates dragging state and captures pointer interactions.
 * @param e - Browser pointerdown event
 * @param state - The ZoomBox transform state object
 * @param img - Target image element
 */
export function handlePointerDown(e: PointerEvent, state: ZoomBoxState, img: HTMLElement): void {
    if (!state || state.zoomLevel <= 1 || !img) return;

    // Prevent native drag behaviors
    e.preventDefault();

    // Capture pointer so drag events stay attached even outside the viewport
    const target = e.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === "function") {
        target.setPointerCapture(e.pointerId);
    }

    state.isDragging = true;
    
    // Store drag offsets relative to current pan coordinates
    state.startX = e.clientX - (state.panX || 0);
    state.startY = e.clientY - (state.panY || 0);

    // Initialize velocity and tracking points for momentum/inertia calculations
    state.velocityX = 0;
    state.velocityY = 0;
    state.lastPointerX = e.clientX;
    state.lastPointerY = e.clientY;

    img.style.cursor = "grabbing";

    dispatchZoomBoxEvent("pan-start", { startX: state.startX, startY: state.startY });
}