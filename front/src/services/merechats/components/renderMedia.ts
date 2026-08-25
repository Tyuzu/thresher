import { createElement } from "../../../components/createElement.js";
import { RenderImagePost } from "./renderImagePost.js";
import { RenderAudioPost } from "./renderAudioPost.js";
import { RenderVideoPost } from "./renderVideoPost.js";

// Media item structure based on your implementation
export interface MediaItem {
  url?: string;
  mimeType?: string;
  type?: string;
  extn?: string;
  [key: string]: unknown;
}

// Message payload structure expected by renderMedia
export interface MediaMessagePayload {
  media?: MediaItem | MediaItem[] | null;
  [key: string]: unknown;
}

/**
 * Renders media content (images, videos, audio) for a message.
 * 
 * @param msg - The message data object
 * @returns The container DOM element or null if no media exists
 */
export function renderMedia(msg: MediaMessagePayload): HTMLElement | null {
  const media = msg?.media;
  if (!media) {
    return null;
  }

  const container = createElement("div", { class: "mediacon" }, []) as HTMLElement;
  const items = Array.isArray(media) ? media : [media];
  const imageIds: string[] = [];

  try {
    for (const m of items) {
      const raw = String(m.url || "").trim();
      if (!raw) {
        continue;
      }

      const type = String(m.mimeType || m.type || "").toLowerCase();

      if (type.startsWith("image/") || m.type === "image") {
        imageIds.push(raw.replace(/\.(png|jpg|jpeg|webp)$/i, ""));
        continue;
      }

      if (type.startsWith("video/") || m.type === "video") {
        RenderVideoPost(container, [raw], raw, m.extn || "");
        continue;
      }

      if (type.startsWith("audio/") || m.type === "audio") {
        RenderAudioPost(container, raw);
        continue;
      }

      // Fallback/Default handling for other types or standalone images
      const chatImage = createElement("div", {}, []) as HTMLElement;
      RenderImagePost(chatImage, [raw]);
      container.appendChild(chatImage);
    }

    // Batch render grouped images if any were collected
    if (imageIds.length > 0) {
      RenderImagePost(container, imageIds);
    }
  } catch (e) {
    console.error("renderMedia:", e);
    container.appendChild(
      createElement("div", { class: "media-error" }, ["[media error]"])
    );
  }

  return container.children.length > 0 ? container : null;
}