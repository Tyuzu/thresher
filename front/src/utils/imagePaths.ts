import { SRC_URL } from "../state/state.js";

export const EntityType = {
  DEFAULT: "default",
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
  ADVT: "advt",
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const PictureType = {
  STATIC: "static",
  AUDIO: "audio",
  BANNER: "banner",
  DOCUMENT: "document",
  FILE: "file",
  GALLERY: "gallery",
  MEMBER: "member",
  PHOTO: "photo",
  POSTER: "poster",
  SEATING: "seating",
  SONG: "song",
  THUMB: "thumb",
  VIDEO: "video",
} as const;

export type PictureType = (typeof PictureType)[keyof typeof PictureType];

const PictureSubfolders: Record<PictureType, string> = {
  [PictureType.STATIC]: "static",
  [PictureType.AUDIO]: "audio",
  [PictureType.BANNER]: "banner",
  [PictureType.DOCUMENT]: "docs",
  [PictureType.FILE]: "files",
  [PictureType.GALLERY]: "gallery",
  [PictureType.MEMBER]: "member",
  [PictureType.PHOTO]: "photo",
  [PictureType.POSTER]: "poster",
  [PictureType.SEATING]: "seating",
  [PictureType.SONG]: "song",
  [PictureType.THUMB]: "thumb",
  [PictureType.VIDEO]: "videos",
};

const VALID_ENTITY_TYPES = new Set<string>(Object.values(EntityType));
const VALID_PICTURE_TYPES = new Set<string>(Object.values(PictureType));

function isImageType(pictureType: PictureType): boolean {
  return (
    pictureType === PictureType.BANNER ||
    pictureType === PictureType.MEMBER ||
    pictureType === PictureType.PHOTO ||
    pictureType === PictureType.POSTER ||
    pictureType === PictureType.SEATING ||
    pictureType === PictureType.THUMB
  );
}

/**
 * Checks if a hostname points to private networks or localhost.
 */
function isLocalOrPrivateHost(host: string): boolean {
  const cleanHost = host.toLowerCase().trim();

  const absoluteMatches = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];
  if (absoluteMatches.includes(cleanHost)) return true;

  if (
    /^10\./.test(cleanHost) ||
    /^192\.168\./.test(cleanHost) ||
    /^169\.254\./.test(cleanHost) ||
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(cleanHost) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHost)
  ) {
    return true;
  }

  if (
    cleanHost.startsWith("fc") ||
    cleanHost.startsWith("fd") ||
    cleanHost.startsWith("fe80:")
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves safe asset paths or converts remote URLs into proxied asset paths.
 */
export function resolveImagePath(
  entityType: EntityType | unknown,
  pictureType: PictureType | unknown,
  filename: unknown,
  fallback: string = "/assets/fallbacks.png"
): string {
  if (
    !entityType ||
    !pictureType ||
    !filename ||
    typeof filename !== "string" ||
    typeof entityType !== "string" ||
    typeof pictureType !== "string" ||
    !VALID_ENTITY_TYPES.has(entityType) ||
    !VALID_PICTURE_TYPES.has(pictureType)
  ) {
    return fallback;
  }

  const cleanFilename = filename.trim();

  // Prevent directory traversal and malicious inline protocols
  if (
    /^(file:|data:|javascript:)/i.test(cleanFilename) ||
    cleanFilename.includes("..") ||
    cleanFilename.includes("%2e%2e")
  ) {
    return fallback;
  }

  const baseUrl = (SRC_URL || "").replace(/\/+$/, "");

  // Absolute HTTP(S) Remote Image Handling
  if (/^https?:\/\//i.test(cleanFilename)) {
    try {
      const parsedUrl = new URL(cleanFilename);

      if (isLocalOrPrivateHost(parsedUrl.hostname)) {
        return fallback;
      }

      // Do not proxy images hosted directly on the application server
      if (baseUrl && cleanFilename.startsWith(baseUrl)) {
        return cleanFilename;
      }

      return `${baseUrl}/proxy?url=${encodeURIComponent(cleanFilename)}`;
    } catch {
      return fallback;
    }
  }

  // Reject paths with control characters or invalid system characters
  if (/[\x00-\x1F\x7F<>:"|?*]/.test(cleanFilename)) {
    return fallback;
  }

  const validPictureType = pictureType as PictureType;
  const validEntityType = entityType as EntityType;

  const folder = PictureSubfolders[validPictureType] || "misc";
  let finalName = cleanFilename;

  // Append missing file extension based on type
  const hasExt = /\.[a-zA-Z0-9]+$/.test(finalName);
  if (!hasExt) {
    switch (validPictureType) {
      case PictureType.THUMB:
      case PictureType.POSTER:
        finalName += ".jpg";
        break;
      default:
        if (isImageType(validPictureType)) {
          finalName += ".png";
        }
        break;
    }
  }

  return `${baseUrl}/uploads/${validEntityType}/${folder}/${finalName}`;
}