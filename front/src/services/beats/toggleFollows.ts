// toggleAction.ts

import { getState } from '../../state/state.js';
import { followEntity } from "./api.js";
import Notify from "../../components/ui/Notify.js";

interface ToggleLabels {
    on: string;
    off: string;
}

interface ToggleActionOptions {
    entityId: string | number;
    entityType: string;
    button: HTMLButtonElement;
    apiPath: string;
    labels: ToggleLabels;
    actionName: string;
}

interface ApiResponse {
    ok?: boolean;
    status?: number;
    [key: string]: any;
}

/**
 * Generic toggle action for follow/subscribe actions
 */
export async function toggleAction({ 
    entityId, 
    entityType, 
    button, 
    apiPath, 
    labels, 
    actionName 
}: ToggleActionOptions): Promise<void> {
    if (!getState("token")) {
        Notify("Please log in first.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    if (!button) {
        Notify("Action button not found.", { type: "info", duration: 3000, dismissible: true });
        return;
    }

    const isActive = button.dataset.active === "true";
    const action = isActive ? "DELETE" : "PUT";
    const apiEndpoint = `${apiPath}${entityId}`;

    const originalText = button.textContent || "";

    // Optimistically update UI
    button.disabled = true;
    button.textContent = isActive ? labels.off : labels.on;
    button.dataset.active = String(!isActive);

    try {
        const response = (await followEntity(apiPath, entityId, action as "PUT" | "DELETE")) as ApiResponse;
        button.disabled = false;

        if (response && response.ok === false) {
            throw new Error(`Server responded with ${response.status || "unknown status"}`);
        }

        Notify(
            `You have ${!isActive ? actionName : `un${actionName}`} this ${entityType}.`,
            { type: "success", duration: 3000, dismissible: true }
        );
    } catch (error: any) {
        // Rollback on failure
        button.textContent = originalText;
        button.dataset.active = String(isActive);
        button.disabled = false;

        console.error(`Error toggling ${actionName}:`, error);
        Notify(`Failed to update ${actionName}: ${error?.message || "Unknown error"}`, { type: "error", duration: 3000, dismissible: true });
    }
}

// External reference stub for FollowUser if needed
declare function FollowUser(button: HTMLButtonElement, userId: string | number): void;

/**
 * Legacy wrapper for user follow button
 */
export function toggleFollow(userId: string | number, followButton: HTMLButtonElement): void {
    FollowUser(followButton, userId);
}