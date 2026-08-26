// zoomboxMouseHelpers.ts

import {
    updateTransform,
    resetTransformState
} from "../../components/ui/zoomBox/zoomboxHelpers.js";
import type { ZoomBoxState as SharedZoomBoxState } from "../../components/ui/zoomBox/zoomBoxTypes.js";
import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";

export type ZoomBoxState = SharedZoomBoxState & {
    isDragging: boolean;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    currentIndex: number;
    lastMouseX?: number;
    lastMouseY?: number;
};

export interface MouseZoomBoxState extends SharedZoomBoxState {
    isDragging: boolean;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    currentIndex: number;
    lastMouseX?: number;
    lastMouseY?: number;
}

// ---------- Extended Interfaces ----------

export interface MouseZoomBoxState extends ZoomBoxState {
    lastMouseX?: number;
    lastMouseY?: number;
}

// ---------- Mouse Handlers ----------

/**
 * Standalone mouse move handler for panning zoomed images
 * @param e - Browser mousemove event
 * @param state - The ZoomBox transform state object
 * @param img - Target image element
 */
export function handleMouseMove(e: MouseEvent, state: MouseZoomBoxState, img: HTMLElement): void {
    if (!state || !state.isDragging || state.zoomLevel <= 1 || !img) return;
    
    e.preventDefault();

    // Calculate delta relative to last mouse position
    const currentX = e.clientX;
    const currentY = e.clientY;

    if (state.lastMouseX !== undefined && state.lastMouseY !== undefined) {
        state.velocityX = currentX - state.lastMouseX;
        state.velocityY = currentY - state.lastMouseY;
    }

    state.lastMouseX = currentX;
    state.lastMouseY = currentY;

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
 * Ends dragging state and triggers smooth inertia animation.
 * @param e - Browser mouseup event
 * @param state - The ZoomBox transform state object
 * @param img - Target image element
 */
export function handleMouseUp(e: MouseEvent, state: MouseZoomBoxState, img: HTMLElement): void {
    if (!state || !state.isDragging || !img) return;

    state.isDragging = false;
    img.style.cursor = state.zoomLevel > 1 ? "grab" : "auto";

    // Clean up temporary tracking markers
    delete state.lastMouseX;
    delete state.lastMouseY;

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
 * Initiates the dragging state and tracks initial mouse coordinates.
 * @param e - Browser mousedown event
 * @param state - The ZoomBox transform state object
 * @param img - Target image element
 */
export function handleMouseDown(e: MouseEvent, state: MouseZoomBoxState, img: HTMLElement): void {
    if (!state || state.zoomLevel <= 1 || !img) return;

    // Prevent native image drag behavior
    e.preventDefault();

    state.isDragging = true;
    
    // Store drag offsets relative to current pan coordinates
    state.startX = e.clientX - (state.panX || 0);
    state.startY = e.clientY - (state.panY || 0);

    // Initialize velocity and last tracking points for momentum/inertia calculations
    state.velocityX = 0;
    state.velocityY = 0;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;

    img.style.cursor = "grabbing";

    dispatchZoomBoxEvent("pan-start", { startX: state.startX, startY: state.startY });
}