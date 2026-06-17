// src/utils/imagePaths.js

import { SRC_URL } from "../state/state";

// Entity types
export const EntityType = {
    ARTIST: "artist",
    BAITO: "baito",
    BLOGPOST: "blogpost",
    CHAT: "chat",
    CROP: "crop",
    EVENT: "event",
    FARM: "farm",
    FEED: "feedpost",
    LIVE: "live",
    MEDIA: "media",
    MENU: "menu",
    MERCH: "merch",
    MUSIC: "music",
    PLACE: "place",
    PRODUCT: "product",
    RECIPE: "recipe",
    REPORT: "report",
    REVIEW: "review",
    SONG: "song",
    USER: "user",
    VENDOR: "vendor",
    WORKER: "worker",
};

// Picture types
export const PictureType = {
    AUDIO: "audio",
    BANNER: "banner",
    DOCUMENT: "document",
    FILE: "file",
    MEMBER: "member",
    PHOTO: "photo",
    POSTER: "poster",
    SEATING: "seating",
    SONG: "song",
    THUMB: "thumb",
    VIDEO: "video",
};

// Folder mapping
const PictureSubfolders = {
    [PictureType.AUDIO]: "audio",
    [PictureType.BANNER]: "banner",
    [PictureType.DOCUMENT]: "docs",
    [PictureType.FILE]: "files",
    [PictureType.MEMBER]: "member",
    [PictureType.PHOTO]: "photo",
    [PictureType.POSTER]: "poster",
    [PictureType.SEATING]: "seating",
    [PictureType.SONG]: "song",
    [PictureType.THUMB]: "thumb",
    [PictureType.VIDEO]: "videos",
};

const VALID_ENTITY_TYPES = new Set(
    Object.values(EntityType)
);

export function resolveImagePath(entityType, pictureType, filename, fallback = "/assets/fallbacks.png") {
    if (
        !entityType ||
        !pictureType ||
        !filename ||
        typeof filename !== "string"
    ) {
        return fallback;
    }

    if (!VALID_ENTITY_TYPES.has(entityType)) {
        return fallback;
    }
    if (
        /^(file:|data:|javascript:)/i.test(filename) ||
        filename.includes("..")
    ) {
        return fallback;
    }

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

            return `${SRC_URL}/proxy/${encodeURIComponent(filename)}`;
        } catch {
            return fallback;
        }
    }

    if (!/^[a-zA-Z0-9._/-]+$/.test(filename)) {
        return fallback;
    }

    const folder = PictureSubfolders[pictureType] || "misc";

    let finalName = filename;

    if (pictureType === PictureType.THUMB) {
        const hasExt = /\.[a-zA-Z0-9]+$/.test(finalName);

        if (pictureType === PictureType.THUMB) {
            if (!hasExt) {
                finalName += ".jpg";
            }
        } else if (isImageType(pictureType)) {
            if (!hasExt) {
                finalName += ".png";
            }
        }
    }

    return `${SRC_URL}/uploads/${entityType}/${folder}/${finalName}`;
}

function isImageType(pictureType) {
    return [
        PictureType.BANNER,
        PictureType.MEMBER,
        PictureType.PHOTO,
        PictureType.POSTER,
        PictureType.SEATING,
        PictureType.THUMB,
    ].includes(pictureType);
}