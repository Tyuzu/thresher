// src/utils/imagePaths.js
import { SRC_URL } from "../state/state";

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

const VALID_ENTITY_TYPES = new Set(Object.values(EntityType));
const VALID_PICTURE_TYPES = new Set(Object.values(PictureType));

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

/**
 * Validates whether a given hostname points to a private loopback or local IP space.
 * Mitigates potential Server-Side Request Forgery (SSRF) vectors.
 */
function isLocalOrPrivateHost(host) {
    const cleanHost = host.toLowerCase().trim();
    
    const absoluteMatches = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];
    if (absoluteMatches.includes(cleanHost)) return true;

    // RFC 1918 / Private Local Area Network ranges
    if (/^10\./.test(cleanHost)) return true;
    if (/^192\.168\./.test(cleanHost)) return true;
    if (/^169\.254\./.test(cleanHost)) return true; // Link-local address
    
    // CGNAT carrier grade private space
    if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(cleanHost)) return true;
    
    // Subnet variations check
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHost)) return true;
    
    // IPv6 Private unicast local address spaces
    if (cleanHost.startsWith("fc") || cleanHost.startsWith("fd") || cleanHost.startsWith("fe80:")) return true;

    return false;
}

/**
 * Resolves safe absolute asset paths from database tokens or remote source links.
 * 
 * @param {string} entityType - The targeted module entity context identifier
 * @param {string} pictureType - Subdirectory partition classification
 * @param {string} filename - Base name string or dynamic remote target location string
 * @param {string} fallback - Default local fallback asset image path
 */
export function resolveImagePath(
    entityType,
    pictureType,
    filename,
    fallback = "/assets/fallbacks.png"
) {
    // Structural Input Sanitization Bounds Check
    if (
        !entityType ||
        !pictureType ||
        !filename ||
        typeof filename !== "string" ||
        !VALID_ENTITY_TYPES.has(entityType) ||
        !VALID_PICTURE_TYPES.has(pictureType)
    ) {
        return fallback;
    }

    const cleanFilename = filename.trim();

    // Security Check: Block relative traversal paths or dangerous protocol hooks
    if (
        /^(file:|data:|javascript:)/i.test(cleanFilename) ||
        cleanFilename.includes("..")
    ) {
        return fallback;
    }

    // --- Absolute Remote URLs Handling Pipeline ---
    if (/^https?:\/\//i.test(cleanFilename)) {
        try {
            const url = new URL(cleanFilename);
            
            if (isLocalOrPrivateHost(url.hostname)) {
                return fallback;
            }

            // Optimization: Skip the internal proxy loop if the image already lives on your base domain
            if (SRC_URL && cleanFilename.startsWith(SRC_URL)) {
                return cleanFilename;
            }

            return `${SRC_URL}/proxy/${encodeURIComponent(cleanFilename)}`;
        } catch {
            return fallback;
        }
    }

    // Security Check: Sanitization filtering while allowing spaces, parentheses, and Unicode names
    // Replaced restrictive raw character checks with directory boundary path checks
    if (/[\x00-\x1F\x7F<>:"|?*]/.test(cleanFilename)) {
        return fallback; 
    }

    const folder = PictureSubfolders[pictureType] || "misc";
    let finalName = cleanFilename;

    // Append correct extension type maps if none are explicitly declared on the item string
    const hasExt = /\.[a-zA-Z0-9]+$/.test(finalName);
    if (!hasExt) {
        switch (pictureType) {
            case PictureType.THUMB:
            case PictureType.POSTER:
                finalName += ".jpg";
                break;
            default:
                if (isImageType(pictureType)) {
                    finalName += ".png";
                }
                break;
        }
    }

    // Construct the fully qualified internal storage domain link
    const baseDomain = SRC_URL ? SRC_URL.replace(/\/$/, "") : "";
    return `${baseDomain}/uploads/${entityType}/${folder}/${finalName}`;
}