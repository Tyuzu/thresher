import {
    uploadFile,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    postMedia,
    MediaUploadResult
} from "../media/api/mediaApi.js";
import {
    fetchMedia,
    deleteMedia,
    postMediaFanmade,
    type MediaItem
} from "./api.js";
import { createElement } from "../../components/createElement.js";
import {
    lazyMediaObserver,
    clear,
    groupMedia,
    createAddMediaButton,
    createMediaActions,
    confirmDelete,
    buildTranslationSection,
    detectCaptionLang
} from "../media/mediaCommon.js";
import {
    resolveImagePath,
    PictureType,
    EntityType
} from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import {
    generateVideoPlayer
} from "../../components/ui/vidpopHelpers/index.js";
import LightBox from "../../components/ui/Lightbox.js";
import Sightbox from "../../components/ui/Sightbox_zoom.js";
import Modal from "../../components/ui/Modal.js";
import { Button } from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.js";
import { UploadStore } from "../media/store/uploadStore.js";

// Re-export upload functions, store, and queue tools from the media API
export {
    uploadFile,
    uploadFiles,
    cancelUpload,
    cancelAllUploads
} from "../media/api/mediaApi.js";
export {
    UploadStore
} from "../media/store/uploadStore.js";
export { fetchMedia, deleteMedia, postMediaFanmade } from "./api.js";

function buildMediaFragment(
    mediaData: MediaItem[],
    entityType: string,
    entityId: string | number,
    isLoggedIn: boolean,
    prefix: string = "media"
): DocumentFragment {
    const frag = document.createDocumentFragment();
    const grouped = groupMedia(mediaData as any);
    for (const group of grouped) {
        const wrapper = createElement("div", {
            class: `${prefix}-group`
        }) as HTMLElement;
        group.forEach((media: MediaItem, i: number) => {
            if (!media.url) {
                return;
            }
            const figure = createElement("figure", {
                class: `${prefix}-item`,
                "data-id": String(media.mediaid)
            }) as HTMLElement;
            const thumbSrc = resolveImagePath(EntityType.MEDIA, PictureType.THUMB, `${media.url}.jpg`);
            const mediaEl = buildMediaElement(media, thumbSrc, i, prefix);
            figure.append(mediaEl);
            
            if (media.caption && media.caption.trim() !== "") {
                const caption = createElement("figcaption", {
                    class: `${prefix}-caption`
                }, [media.caption]);
                const translation = buildTranslationSection(media.caption, media.captionlang);
                figure.append(caption);
                if (translation) {
                    figure.append(...translation);
                }
            }
            const actions = createMediaActions(media as any, entityType, entityId, isLoggedIn, confirmDelete, prefix);
            figure.append(actions);
            wrapper.append(figure);
        });
        frag.append(wrapper);
    }
    return frag;
}

/* ------------------------------------------------------
   MEDIA ELEMENT BUILDER
------------------------------------------------------ */
function buildMediaElement(media: MediaItem, thumbSrc: string, index: number, prefix: string): HTMLElement {
    if (media.type === "image") {
        const img = Imagex({
            "data-src": thumbSrc,
            classes: `${prefix}-img`,
            "data-index": index
        }) as HTMLElement;
        img.addEventListener("click", () => Sightbox(thumbSrc, "image"));
        lazyMediaObserver.observe(img);
        return img;
    }
    if (media.type === "video") {
        const videoSrc = resolveImagePath(EntityType.MEDIA, PictureType.VIDEO, `${media.url}${media.extn || ".mp4"}`);
        const img = Imagex({
            src: thumbSrc,
            classes: `${prefix}-img`,
            "data-index": index
        }) as HTMLElement;
        const vidEl = createElement("div", {}, []) as HTMLElement;
        generateVideoPlayer(videoSrc, thumbSrc, [], [], media.url as string).then((videoPlayer: HTMLElement) => {
            vidEl.appendChild(videoPlayer);
        });
        img.addEventListener("click", () => {
            const container = createElement("div", {
                class: "lightbox-video-container"
            }, [vidEl]) as HTMLElement;
            LightBox(container);
        });
        return img;
    }
    return createElement("div", {
        class: `${prefix}-unsupported`
    }, [`Unsupported media type: ${media.type}`]) as HTMLElement;
}

/* ------------------------------------------------------
   DISPLAY GALLERY
------------------------------------------------------ */
export async function displayFanMedia(
    content: HTMLElement,
    entityType: string,
    entityId: string | number,
    isLoggedIn: boolean
): Promise<void> {
    clear(content);
    const loader = createElement("p", {
        class: "loading"
    }, ["Loading media..."]) as HTMLElement;
    const list = createElement("div", {
        class: "fanmade-list"
    }) as HTMLElement;
    content.append(loader);
    try {
        const mediaData = await fetchMedia(entityType, entityId) as MediaItem[];
        loader.remove();
        if (!Array.isArray(mediaData) || mediaData.length === 0) {
            content.append(createElement("p", {}, ["No media available."]));
            const addBtn = createAddMediaButton(isLoggedIn, entityType, entityId, list, showMediaUploadForm);
            if (addBtn) {
                content.append(addBtn);
            }
            return;
        }
        const frag = buildMediaFragment(mediaData, entityType, entityId, isLoggedIn, "fanmade");
        list.append(frag);
        const addBtn = createAddMediaButton(isLoggedIn, entityType, entityId, list, showMediaUploadForm);
        if (addBtn) {
            content.append(addBtn);
        }
        content.append(list);
        list.addEventListener("click", (e: Event) => {
            const target = e.target as HTMLElement;
            const img = target.closest(".fanmade-img");
            if (img) {
                return;
            }
        });
    } catch (err) {
        console.error("Fan media fetch error:", err);
        loader.replaceWith(createElement("p", {
            class: "error"
        }, ["Failed to load fan media."]));
    }
}

/* ------------------------------------------------------
   UID
------------------------------------------------------ */
export function uid(): string {
    return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);
}

/* ------------------------------------------------------
   FILE TYPE
------------------------------------------------------ */
function getFileType(file: File): string {
    if (file.type.startsWith("image/")) {
        return "image";
    }
    if (file.type.startsWith("video/")) {
        return "video";
    }
    return "unknown";
}

/* ------------------------------------------------------
   FILE EXTENSION
------------------------------------------------------ */
function getFileExtension(file: File): string {
    const name = file.name;
    const lastDot = name.lastIndexOf(".");
    return lastDot !== -1 ? name.substring(lastDot) : "";
}

/* ------------------------------------------------------
   MAIN MODAL & UPLOAD LOGIC
------------------------------------------------------ */
export function showMediaUploadForm(
    isLoggedIn: boolean,
    entityType: string,
    entityId: string | number,
    _mediaList: HTMLElement
): void {
    const uploadsDiv = createElement("div", {
        class: "upload-list"
    }) as HTMLElement;
    
    const caption = createElement("textarea", {
        placeholder: "Write a caption...",
        class: "upload-caption",
    }) as HTMLTextAreaElement;

    const fileInputId = `mediaFileInput-${uid()}`;
    const fileInput = createElement("input", {
        type: "file",
        multiple: true,
        accept: "image/*,video/*",
        class: "hidden",
        id: fileInputId,
    }) as HTMLInputElement;

    const dropZone = createElement("div", {
        class: "upload-dropzone"
    }, [
        createElement("label", {
            for: fileInputId,
            class: "upload-label"
        }, ["Select or drop files here"]),
        fileInput
    ]) as HTMLElement;

    const submit = Button({title:"Upload All", id:"submitUploadsBtn", events:{
        click: () => submitGroupedUploads(caption, uploadsDiv, entityType, entityId, modal)
    }, classes:"button-primary"}) as HTMLElement;
    submit.style.display = "none";

    const content = createElement("div", {
        class: "upload-container"
    }, [
        dropZone,
        caption,
        uploadsDiv,
        submit
    ]) as HTMLElement;

    const modal = Modal({
        title: "Upload Media",
        content,
        onClose: () => {
            cancelAllUploads();
            UploadStore.uploads.forEach((u: any) => {
                if (u.previewURL) {
                    URL.revokeObjectURL(u.previewURL);
                }
            });
            UploadStore.clear();
        },
        size: "large"
    });

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        dropZone.classList.remove("drag-active");
        if (e.dataTransfer?.files) {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files, caption, uploadsDiv, submit, entityType, entityId);
        }
    };

    dropZone.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        dropZone.classList.add("drag-active");
    });
    
    dropZone.addEventListener("dragleave", (e: DragEvent) => {
        e.preventDefault();
        dropZone.classList.remove("drag-active");
    });
    
    dropZone.addEventListener("drop", handleDrop as EventListener);

    fileInput.addEventListener("change", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            handleFiles(Array.from(target.files), caption, uploadsDiv, submit, entityType, entityId);
        }
    });
}

/* ------------------------------------------------------
   VALIDATION
------------------------------------------------------ */
function validateFile(file: File): void {
    const MAX_SIZE_MB = 100;
    const validTypes = ["image/", "video/"];
    if (!validTypes.some((t) => file.type.startsWith(t))) {
        throw new Error(`${file.name}: Unsupported file type`);
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`${file.name}: File too large`);
    }
}

/* ------------------------------------------------------
   HANDLE FILES
------------------------------------------------------ */
function handleFiles(
    files: File[],
    caption: HTMLTextAreaElement,
    uploadsDiv: HTMLElement,
    submit: HTMLElement,
    entityType: string,
    entityId: string | number
): void {
    try {
        files.forEach(validateFile);
    } catch (err: any) {
        Notify(err.message, {
            type: "error"
        });
        return;
    }

    const newUploads = files.map((f) => ({
        id: uid(),
        file: f,
        previewURL: URL.createObjectURL(f),
        progress: 0,
        status: "queued",
        fileType: getFileType(f),
        extension: getFileExtension(f),
        entityType,
        entityId,
        serverData: null,
        dropData: null
    }));
    
    (UploadStore.uploads as any[]).push(...newUploads);
    renderUploads(uploadsDiv, submit);
    newUploads.forEach((u) => uploadFileAndTrack(u, uploadsDiv, submit));
}

/* ------------------------------------------------------
   UPLOAD TRACKER
------------------------------------------------------ */
async function uploadFileAndTrack(u: any, uploadsDiv: HTMLElement, submit: HTMLElement): Promise<void> {
    try {
        const dropData: MediaUploadResult = await uploadFile({
            id: u.id,
            file: u.file,
            entityType: u.entityType,
            entityId: String(u.entityId || "")
        });

        UploadStore.update(u.id, {
            status: "done",
            dropData,
            progress: 100
        });

        Notify(`Uploaded: ${u.file.name}`, {
            type: "success"
        });
    } catch (err: any) {
        Notify(err.message || "Upload failed", {
            type: "error"
        });
    } finally {
        renderUploads(uploadsDiv, submit);
    }
}

/* ------------------------------------------------------
   SUBMIT GROUP
------------------------------------------------------ */
async function submitGroupedUploads(
    caption: HTMLTextAreaElement,
    uploadsDiv: HTMLElement,
    entityType: string,
    entityId: string | number,
    modal: { close?: () => void }
): Promise<void> {
    const ready = UploadStore.uploads.filter(
        (u: any) => u.dropData && !u.serverData
    );

    if (!ready.length) {
        Notify("No uploads ready to submit.", {
            type: "info"
        });
        return;
    }

    const captionLang = detectCaptionLang(caption.value);
    const payload = {
        caption: caption.value,
        captionLang,
        files: ready.map((u: any) => ({
            filename: u.dropData.filename || u.dropData.key,
            extn: u.dropData.extension || u.extension
        }))
    };

    try {
        const res = await postMediaFanmade(entityType, entityId, payload) as any;
        if (Array.isArray(res)) {
            ready.forEach((u: any, i: number) => {
                UploadStore.update(u.id, {
                    serverData: res[i]
                });
            });
            Notify("Media submitted successfully!", {
                type: "success",
                dismissible: true
            });
            modal.close?.();
        }
    } catch (err: any) {
        Notify(err.message || "Failed to submit media", {
            type: "error"
        });
    }
}

/* ------------------------------------------------------
   RENDER UPLOADS
------------------------------------------------------ */
function renderUploads(uploadsDiv: HTMLElement, submit: HTMLElement): void {
    const currentIds = new Set(UploadStore.uploads.map((u: any) => u.id));
    uploadsDiv.querySelectorAll(".upload-card").forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        if (!currentIds.has(htmlEl.dataset.id)) {
            htmlEl.remove();
        }
    });

    UploadStore.uploads.forEach((u: any) => {
        const existing = uploadsDiv.querySelector(`[data-id="${u.id}"]`);
        if (existing) {
            const bar = existing.querySelector(".upload-progress > div") as HTMLElement;
            if (bar) {
                bar.style.width = `${u.progress || 0}%`;
            }
            existing.classList.toggle("upload-error", u.status === "error");
            existing.classList.toggle("upload-done", u.status === "done");
            return;
        }

        const preview = u.fileType === "image" ? Imagex({
            src: u.previewURL,
            class: "upload-preview"
        }) : createElement("video", {
            src: u.previewURL,
            controls: true,
            class: "upload-preview",
        });

        const progress = createElement("div", {
            class: "upload-progress"
        }, [
            createElement("div", {
                class: "upload-progress-bar",
                    style: (`width:${u.progress || 0}%`) as any
            })
        ]);

        const removeBtn = Button({title:"Remove", id:"", events:{
            click: () => {
                cancelUpload(u.id);
                if (u.previewURL) {
                    URL.revokeObjectURL(u.previewURL);
                }
                UploadStore.remove(u.id);
                renderUploads(uploadsDiv, submit);
            }
        }, classes:"button-secondary"});

        const card = createElement("div", {
            class: `upload-card ${u.status === "error" ? "upload-error" : ""} ${u.status === "done" ? "upload-done" : ""}`,
            "data-id": u.id
        }, [
            preview,
            createElement("p", {}, [u.file.name]),
            progress,
            removeBtn
        ]);

        uploadsDiv.append(card);
    });

    submit.style.display = UploadStore.uploads.some(
        (u: any) => u.dropData && !u.serverData
    ) ? "inline-block" : "none";
}