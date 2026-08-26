import { createElement } from "../../components/createElement.js";
import Button, { ButtonOptions } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import Notify from "../../components/ui/Notify.js";
import { getState } from "../../state/state.js";
import { reportEntity } from "../reporting/reporting.js";
import { deleteMedia } from "./api/mediaApi.js";
import { apiFetch } from "../../api/api.js";

/* ======================================================
   TYPES & INTERFACES
====================================================== */

export type MediaType = "image" | "video" | "unknown";

export interface MediaItem {
    mediaid: string | number;
    creatorid?: string | number;
    url: string;
    mediaGroupId?: string;
    type?: string;
    caption?: string;
    extn?: string;
    [key: string]: unknown;
}

export type DeleteHandler = (
    mediaId: string | number,
    entityType: string,
    entityId: string | number
) => void;

export type ShowUploadFormFn = (
    isLoggedIn: boolean,
    entityType: string,
    entityId: string | number,
    list: HTMLElement
) => void;

export interface DeleteResponse {
    success?: boolean;
    [key: string]: unknown;
}

export interface TranslationResponse {
    translated?: string;
    [key: string]: unknown;
}

/* ======================================================
   Lazy Loading for Images & Videos
====================================================== */

export const lazyMediaObserver = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
        for (const { target, isIntersecting } of entries) {
            const mediaTarget = target as HTMLImageElement | HTMLVideoElement;

            if (!mediaTarget.dataset.src) {
                continue;
            }

            if (isIntersecting) {
                mediaTarget.src = mediaTarget.dataset.src;
                delete mediaTarget.dataset.src;

                if (mediaTarget instanceof HTMLVideoElement) {
                    mediaTarget.load();
                }
                lazyMediaObserver.unobserve(mediaTarget);
            } else if (mediaTarget instanceof HTMLVideoElement) {
                mediaTarget.pause();
            }
        }
    },
    { rootMargin: "150px 0px", threshold: 0.05 }
);

/* ======================================================
   Helpers
====================================================== */

export const clear = (el: HTMLElement): void => {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
};

export const groupMedia = <T extends MediaItem>(media: T[]): T[][] => {
    const grouped = media.reduce<Record<string, T[]>>((acc, m) => {
        const key = m.mediaGroupId || "ungrouped";
        (acc[key] ??= []).push(m);
        return acc;
    }, {});

    return Object.values(grouped);
};

/* ======================================================
   Helper: Determine media type
====================================================== */

export function getFileType(media: Partial<MediaItem> | null | undefined): MediaType {
    if (!media) {
        return "unknown";
    }
    if (media.type?.startsWith("image")) {
        return "image";
    }
    if (media.type?.startsWith("video")) {
        return "video";
    }

    const url = media.url || "";
    if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)) {
        return "image";
    }
    if (/\.(mp4|webm|ogg)$/i.test(url)) {
        return "video";
    }
    return "unknown";
}

/* ======================================================
   Add Media Button
====================================================== */

export const createAddMediaButton = (
    isLoggedIn: boolean,
    entityType: string,
    entityId: string | number,
    list: HTMLElement,
    showUploadForm: ShowUploadFormFn,
    classes = "primary"
): HTMLElement | null => {
    if (!isLoggedIn) {
        return null;
    }

    const options: ButtonOptions = {
        title: "Add Media",
        id: "add-media-btn",
        classes,
        events: {
            click: () => showUploadForm(isLoggedIn, entityType, entityId, list)
        }
    };

    return Button(options);
};

/* ======================================================
   Create Media Actions (Delete / Report)
====================================================== */

export function createMediaActions(
    media: MediaItem,
    entityType: string,
    entityId: string | number,
    isLoggedIn: boolean,
    deleteHandler: DeleteHandler,
    classPrefix = "media"
): HTMLElement {
    const actions = createElement("div", { class: `${classPrefix}-actions` });
    const user = getState("user")?.userid;

    // Delete (if owner)
    if (isLoggedIn && user === media.creatorid) {
        actions.append(
            Button({
                title: "Delete",
                classes: `delete-${classPrefix}-btn`,
                events: {
                    click: () => deleteHandler(media.mediaid, entityType, entityId)
                }
            })
        );
    }

    // Report
    actions.append(
        Button({
            title: "Report",
            classes: "report-btn",
            events: {
                click: () => reportEntity(String(media.mediaid), "media")
            }
        })
    );

    return actions;
}

/* ======================================================
   Confirm Delete
====================================================== */

export async function confirmDelete(
    mediaId: string | number,
    entityType: string,
    entityId: string | number,
    itemSelector = ".media-item"
): Promise<void> {
    if (!confirm("Delete this media?")) {
        return;
    }

    try {
        const res = await deleteMedia(mediaId, entityType, entityId) as any;

        if (res.success === true) {
            const item = document.querySelector<HTMLElement>(
                `${itemSelector}[data-id="${mediaId}"]`
            );
            const parent = item?.parentElement;

            item?.remove();
            if (parent && !parent.querySelector(itemSelector)) {
                parent.remove();
            }

            Notify("Media deleted.", { type: "success" });
        } else {
            Notify("Failed to delete media.", { type: "error" });
        }
    } catch (err) {
        console.error(err);
        Notify("Error deleting media.", { type: "error" });
    }
}

/* ======================================================
   Restore Video Thumbnail
====================================================== */

export function restoreVideoThumb(
    wrapper: HTMLElement,
    thumb: string,
    classPrefix = "media"
): void {
    clear(wrapper);

    const thumbImg = Imagex({
        src: thumb,
        classes: `${classPrefix}-video-thumb`
    });

    const overlay = createElement("div", { class: "video-play-overlay" }, ["▶"]);

    wrapper.append(thumbImg, overlay);
}

/* ======================================================
   Translation Support
====================================================== */

export async function fetchTranslation(
    text: string,
    fromLang: string,
    toLang: string
): Promise<string> {
    try {
        const res = await apiFetch<TranslationResponse>(
            `/translate?from=${fromLang}&to=${toLang}`,
            "POST",
            { text }
        );
        return res?.translated || "";
    } catch {
        return "";
    }
}

export async function handleTranslationToggle(
    toggle: HTMLElement,
    originalText: string,
    translationBox: HTMLElement,
    fromLang: string | null = null,
    toLang: string | null = null
): Promise<void> {
    const state = toggle.dataset.state;
    const userLang = toLang || localStorage.getItem("lang") || "en";
    const captionLang = fromLang || "unknown";

    if (state === "original") {
        toggle.textContent = "Hide Translation";
        toggle.dataset.state = "translated";

        // lazy fetch translation
        const translated = await fetchTranslation(originalText, captionLang, userLang);
        translationBox.textContent = translated || "(Translation unavailable)";
        translationBox.style.display = "block";
    } else {
        toggle.textContent = "See Translation";
        toggle.dataset.state = "original";
        translationBox.style.display = "none";
    }
}

export function buildTranslationSection(
    captionText: string,
    captionLang: string | null = null
): [HTMLElement, HTMLElement] | null {
    if (!captionText) {
        return null;
    }

    const userLang = localStorage.getItem("lang") || "en";
    const lang = captionLang || detectCaptionLang(captionText);

    // No translation toggle needed if languages match or unknown
    if (lang === userLang || lang === "unknown") {
        return null;
    }

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

    toggle.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        await handleTranslationToggle(
            toggle,
            captionText,
            translationBox,
            lang,
            userLang
        );
    });

    return [toggle, translationBox];
}

/* ======================================================
   Detect Caption Language
====================================================== */

export function detectCaptionLang(text: string): string {
    const s = text.trim();
    if (!s) {
        return "unknown";
    }

    for (const ch of s) {
        const code = ch.charCodeAt(0);
        if (code >= 0x4e00 && code <= 0x9fff) {
            return "zh";
        } // Chinese
        if (
            (code >= 0x3040 && code <= 0x309f) ||
            (code >= 0x30a0 && code <= 0x30ff)
        ) {
            return "ja";
        } // Japanese
        if (code >= 0xac00 && code <= 0xd7af) {
            return "ko";
        } // Korean
    }
    return "en";
}