import "../../../../css/subpages/medialist.css";
import "../../../../css/subpages/media.css";
import { createElement } from "../../../components/createElement.js";
import { fetchMedia } from "../api/mediaApi.js";
import { showMediaUploadForm } from "./mediaUploadForm.js";
import {
  lazyMediaObserver,
  clear,
  groupMedia,
  createAddMediaButton,
  createMediaActions,
  confirmDelete
} from "../mediaCommon.js";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";
import { handleTranslationToggle } from "../../fanmade/translate.js";
import Sightbox from "../../../components/ui/Sightbox_zoom.js";
import LightBox from "../../../components/ui/Lightbox.js";
import { generateVideoPlayer } from "../../../components/ui/vidpopHelpers/index.js";

/* ------------------------------------------------------
   Types & Interfaces
------------------------------------------------------ */
export interface MediaItem {
  mediaid: string | number;
  url: string;
  creatorid?: string | number;
  type?: string;
  caption?: string;
  extn?: string;
  [key: string]: unknown;
}

export type MediaType = "image" | "video" | "unknown";

/* ------------------------------------------------------
   Type Guards
------------------------------------------------------ */
function isMediaItem(item: unknown): item is MediaItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "mediaid" in item &&
    "url" in item &&
    "creatorid" in item &&
    typeof (item as MediaItem).url === "string"
  );
}

/* ------------------------------------------------------
   Helper: Determine media type
------------------------------------------------------ */
function getFileType(media: MediaItem): MediaType {
  if (!media?.type) {
    if (media.url && /\.(mp4|webm|ogg)$/i.test(media.url)) {
      return "video";
    }
    if (media.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(media.url)) {
      return "image";
    }
    return "unknown";
  }
  if (media.type.startsWith("image")) return "image";
  if (media.type.startsWith("video")) return "video";
  return "unknown";
}

/* ------------------------------------------------------
   BUILD MEDIA FRAGMENT
------------------------------------------------------ */
function buildMediaFragment(
  mediaData: MediaItem[],
  entityType: EntityType | string,
  entityId: string | number,
  isLoggedIn: boolean,
  prefix: string = "media"
): DocumentFragment {
  const frag = document.createDocumentFragment();
  const grouped: MediaItem[][] = groupMedia(mediaData);

  grouped.forEach((group) => {
    const wrapper = createElement("div", { class: `${prefix}-group` });

    group.forEach((media, i) => {
      if (!media.url) return;

      const mediaType = getFileType(media);
      const figure = createElement("figure", {
        class: `${prefix}-item`,
        "data-id": String(media.mediaid)
      });

      const thumbSrc = resolveImagePath(EntityType.MEDIA, PictureType.THUMB, `${media.url}.jpg`);
      const captionText = media.caption ?? "";
      const mediaEl = buildMediaElement(media, thumbSrc, i, prefix, mediaType);
      const caption = createElement("figcaption", { class: `${prefix}-caption` }, [captionText]);

      const translation = buildTranslationSection(captionText);
      const actions = createMediaActions(
        media,
        String(entityType),
        entityId,
        isLoggedIn,
        confirmDelete,
        prefix
      );

      figure.append(mediaEl, caption);
      if (translation) {
        figure.append(...translation);
      }
      if (actions) {
        figure.append(actions);
      }

      wrapper.append(figure);
    });

    frag.append(wrapper);
  });

  return frag;
}

/* ------------------------------------------------------
   MEDIA ELEMENT BUILDER
------------------------------------------------------ */
function buildMediaElement(
  media: MediaItem,
  thumbSrc: string,
  index: number,
  prefix: string,
  type: MediaType
): HTMLElement {
  if (type === "image") {
    const img = Imagex({
      "data-src": thumbSrc,
      classes: `${prefix}-img`,
      "data-index": String(index)
    });

    img.addEventListener("click", () => Sightbox(thumbSrc, "image"));
    lazyMediaObserver.observe(img);
    return img;
  }

  if (type === "video") {
    const videoSrc = resolveImagePath(
      EntityType.MEDIA,
      PictureType.VIDEO,
      `${media.url}${media.extn || ".mp4"}`
    );

    const img = Imagex({
      "data-src": thumbSrc,
      classes: `${prefix}-img`,
      "data-index": String(index)
    });

    // Observe video thumbnail for lazy loading
    lazyMediaObserver.observe(img);

    // Lazy load video player directly into Lightbox on click
    img.addEventListener("click", async () => {
      try {
        const videoPlayer = await generateVideoPlayer(videoSrc, thumbSrc, [], [], media.url);
        if (videoPlayer) {
          const container = createElement("div", { class: "lightbox-video-container" }, [videoPlayer]);
          LightBox(container);
        }
      } catch (err: unknown) {
        console.error("Video player error for LightBox:", err);
      }
    });

    return img;
  }

  return createElement("div", { class: `${prefix}-unsupported` }, [
    `Unsupported media type: ${type}`
  ]);
}

/* ------------------------------------------------------
   TRANSLATION TOGGLE BUILDER
------------------------------------------------------ */
function buildTranslationSection(captionText: string): [HTMLElement, HTMLElement] | null {
  if (!captionText) return null;

  const translationBox = createElement("div", {
    class: "translation-container",
    style: "display:none;"
  });

  const toggle = createElement(
    "span",
    {
      class: "translate-toggle",
      "data-state": "original"
    },
    ["See Translation"]
  );

  toggle.addEventListener("click", async (e: MouseEvent) => {
    e.stopPropagation();
    await handleTranslationToggle(toggle, captionText, translationBox);
  });

  return [toggle, translationBox];
}

/* ------------------------------------------------------
   DISPLAY MEDIA GALLERY
------------------------------------------------------ */
export async function displayMedia(
  content: HTMLElement,
  entityType: EntityType | string,
  entityId: string | number,
  isLoggedIn: boolean
): Promise<void> {
  clear(content);

  const title = createElement("h2", {}, ["Media Gallery"]);
  const loader = createElement("p", { class: "loading" }, ["Loading media..."]);
  const list = createElement("div", { class: "media-list" });

  const addBtn = createAddMediaButton(
    isLoggedIn,
    String(entityType),
    entityId,
    list,
    showMediaUploadForm
  );
  if (addBtn) {
    content.append(addBtn);
  }

  content.append(title, loader, list);

  try {
    const response: unknown = await fetchMedia(entityType, entityId);
    loader.remove();

    if (!Array.isArray(response)) {
      content.append(createElement("p", {}, ["No media available."]));
      return;
    }

    const mediaData = response.filter(isMediaItem);

    if (mediaData.length === 0) {
      content.append(createElement("p", {}, ["No media available."]));
      return;
    }

    const frag = buildMediaFragment(mediaData, entityType, entityId, isLoggedIn, "media");
    list.append(frag);
  } catch (err: unknown) {
    console.error("Media fetch error:", err);
    loader.replaceWith(
      createElement("p", { class: "error" }, ["Failed to load media."])
    );
  }
}