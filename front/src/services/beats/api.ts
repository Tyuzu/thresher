import { apiFetch } from "../../api/api.js";

export interface ToggleLikeResponse {
    liked: boolean;
    count: number;
    [key: string]: any;
}

export async function toggleLike(entityType: string, entityId: string | number): Promise<ToggleLikeResponse> {
    try {
        const path = `/likes/${entityType}/like/${entityId}`;
        return (await apiFetch(path, "PUT")) as ToggleLikeResponse;
    } catch (err) {
        console.error("beats.api.toggleLike error:", err);
        return { liked: false, count: 0 } as ToggleLikeResponse;
    }
}

export async function followEntity(apiPath: string, entityId: string | number, method: "PUT" | "DELETE") {
    try {
        const endpoint = `${apiPath}${entityId}`;
        return await apiFetch(endpoint, method);
    } catch (err) {
        console.error("beats.api.followEntity error:", err);
        return { ok: false };
    }
}

export default {
    toggleLike,
    followEntity,
};
