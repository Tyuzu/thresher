// src/utils/imagePaths.js

import { SRC_URL } from "../state/state";

// Entity types
export const EntityType = {
    ARTIST: "artist",
    MEMBER: "member",
    USER: "user",
    BAITO: "baito",
    WORKER: "worker",
    SONG: "song",
    POST: "post",
    CHAT: "chat",
    EVENT: "event",
    FARM: "farm",
    CROP: "crop",
    PLACE: "place",
    RECIPE: "recipe",
    PRODUCT: "product",
    TOOL: "tool",
    LIVE: "live",
    MEDIA: "media",
    MERCH: "merch",
    MENU: "menu",
    FEED: "feedpost",
    LOOP: "loops",
};

// Picture types
export const PictureType = {
    BANNER: "banner",
    PHOTO: "photo",
    POSTER: "poster",
    SEATING: "seating",
    MEMBER: "member",
    THUMB: "thumb",
    IMAGE: "images",
    AUDIO: "audio",
    VIDEO: "videos",
    DOCUMENT: "docs",
    GALLERY: "gallery",
    FILE: "files",
};

// Folder mapping
const PictureSubfolders = {
    [PictureType.BANNER]: "banner",
    [PictureType.PHOTO]: "photo",
    [PictureType.POSTER]: "poster",
    [PictureType.SEATING]: "seating",
    [PictureType.MEMBER]: "member",
    [PictureType.THUMB]: "thumb",
    [PictureType.IMAGE]: "images",
    [PictureType.AUDIO]: "audio",
    [PictureType.VIDEO]: "videos",
    [PictureType.DOCUMENT]: "docs",
    [PictureType.GALLERY]: "gallery",
    [PictureType.FILE]: "files",
};

const VALID_ENTITY_TYPES = new Set(
    Object.values(EntityType)
);

export function resolveImagePath(
    entityType,
    pictureType,
    filename,
    fallback = "/assets/fallbacks.png"
) {
    if (
        !entityType ||
        !pictureType ||
        !filename ||
        typeof filename !== "string"
    ) {
        return fallback;
    }

    // Validate entity type
    if (!VALID_ENTITY_TYPES.has(entityType)) {
        return fallback;
    }

    // Reject obviously unsafe input
    if (
        /^(file:|data:|javascript:)/i.test(filename) ||
        filename.includes("..")
    ) {
        return fallback;
    }

    // Handle full external URLs
    if (/^https?:\/\//i.test(filename)) {
        try {
            const url = new URL(filename);
            const host = url.hostname.toLowerCase();

            const isBlockedHost =
                host === "localhost" ||
                host === "127.0.0.1" ||
                host === "::1" ||
                host === "0.0.0.0" ||
                /^10\./.test(host) ||
                /^192\.168\./.test(host) ||
                /^169\.254\./.test(host) ||
                /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(host) ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
                host.startsWith("fc") ||
                host.startsWith("fd") ||
                host.startsWith("fe80:");

            if (isBlockedHost) {
                return fallback;
            }

            // Proxy external images through backend
            return `${SRC_URL}/proxy?url=${encodeURIComponent(filename)}`;

        } catch {
            return fallback;
        }
    }

    // Validate local filename/path
    if (!/^[a-zA-Z0-9._/-]+$/.test(filename)) {
        return fallback;
    }

    const folder =
        PictureSubfolders[pictureType] || "misc";

    let finalName = filename;

    // Normalize extensions
    if (pictureType === PictureType.THUMB) {
        if (!finalName.toLowerCase().endsWith(".jpg")) {
            const dotIndex = finalName.lastIndexOf(".");

            if (dotIndex >= 0) {
                finalName = finalName.substring(0, dotIndex);
            }

            finalName += ".jpg";
        }
    } else if (isImageType(pictureType)) {
        if (!finalName.toLowerCase().endsWith(".png")) {
            const dotIndex = finalName.lastIndexOf(".");

            if (dotIndex >= 0) {
                finalName = finalName.substring(0, dotIndex);
            }

            finalName += ".png";
        }
    }

    return `${SRC_URL}/uploads/${entityType}/${folder}/${finalName}`;
}

// Helper to check if type is image (non-thumb)
function isImageType(pictureType) {
    return [
        PictureType.PHOTO,
        PictureType.POSTER,
        PictureType.BANNER,
        PictureType.SEATING,
        PictureType.MEMBER,
        PictureType.IMAGE,
        PictureType.GALLERY,
    ].includes(pictureType);
}