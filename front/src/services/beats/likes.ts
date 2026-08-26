// toggleLike.ts

import { apiFetch } from "../../api/api.js";

export interface ToggleLikeResponse {
    liked: boolean;
    count: number;
    [key: string]: any;
}

/**
 * Toggle like for a given entity type and ID.
 * Endpoint: PUT /likes/:entitytype/like/:entityid
 */
export async function toggleLike(
    entityType: string, 
    entityId: string | number
): Promise<ToggleLikeResponse> {
    try {
        const path = `/likes/${entityType}/like/${entityId}`;
        const response = (await apiFetch(path, "PUT")) as ToggleLikeResponse | null;

        // Expecting: { liked: boolean, count: number }
        if (response && typeof response.liked === "boolean" && typeof response.count === "number") {
            return response;
        }

        return { liked: false, count: 0 };
    } catch (err) {
        console.error("toggleLike error:", err);
        return { liked: false, count: 0 };
    }
}