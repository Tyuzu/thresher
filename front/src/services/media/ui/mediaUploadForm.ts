import "../../../../css/subpages/mediaup.css";
import Modal from "../../../components/ui/Modal.js";
import Button, { ButtonOptions } from "../../../components/base/Button.js";
import { createElement } from "../../../components/createElement.js";
import Notify from "../../../components/ui/Notify.js";
import Imagex from "../../../components/base/Imagex.js";
import { UploadStore, UploadProgressItem } from "../store/uploadStore.js";
import { uploadFile, postMedia, MediaUploadResult } from "../api/mediaApi.js";
import { detectCaptionLang } from "../mediaCommon.js";

/* ======================================================
   TYPES & INTERFACES
====================================================== */

export type FileType = "image" | "video" | "unknown";

export type ModalType = ReturnType<typeof Modal>;

export interface CustomUploadItem extends UploadProgressItem {
    id: string;
    file: File;
    previewURL: string;
    progress: number;
    uploading: boolean;
    fileType: FileType;
    mediaEntity: string;
    entityType: string;
    entityId: string;
    extension: string;
    dropData?: MediaUploadResult;
    serverData?: unknown;
    error?: boolean;
    done?: boolean;
}

export interface PostMediaPayload {
    caption: string;
    captionLang: string;
    files: Array<{
        filename: string;
        extn: string;
    }>;
}

/* ======================================================
   HELPERS
====================================================== */

export function uid(): string {
    return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);
}

function getFileType(file: File): FileType {
    if (file.type.startsWith("image/")) {
        return "image";
    }
    if (file.type.startsWith("video/")) {
        return "video";
    }
    return "unknown";
}

function getFileExtension(file: File): string {
    const name = file.name;
    const lastDot = name.lastIndexOf(".");
    return lastDot !== -1 ? name.substring(lastDot) : "";
}

/* ======================================================
   MAIN COMPONENT / FUNCTION
====================================================== */

export function showMediaUploadForm(
    isLoggedIn: boolean,
    entityType: string,
    entityId: string | number,
    _mediaList?: HTMLElement
): void {
    const uploadsDiv = createElement("div", { class: "upload-list" });
    const caption = createElement("textarea", {
        placeholder: "Write a caption...",
        class: "upload-caption"
    }) as HTMLTextAreaElement;

    const fileInputId = `mediaFileInput-${uid()}`;
    const fileInput = createElement("input", {
        type: "file",
        multiple: true,
        accept: "image/*,video/*",
        class: "hidden",
        id: fileInputId
    }) as HTMLInputElement;

    const dropZone = createElement("div", { class: "upload-dropzone" }, [
        createElement("label", { for: fileInputId, class: "upload-label" }, [
            "Select or drop files here"
        ]),
        fileInput
    ]);

    const submitOptions: ButtonOptions = {
        title: "Upload All",
        id: "submitUploadsBtn",
        classes: "button-primary",
        events: {
            click: () =>
                submitGroupedUploads(
                    caption,
                    uploadsDiv,
                    entityType,
                    entityId,
                    modal
                )
        }
    };

    const submit = Button(submitOptions);
    submit.style.display = "none";

    const content = createElement("div", { class: "upload-container" }, [
        dropZone,
        caption,
        uploadsDiv,
        submit
    ]);

    const modal = Modal({
        title: "Upload Media",
        content,
        onClose: () => {
            // Cleanup URLs to prevent blob leaks
            (UploadStore.uploads as CustomUploadItem[]).forEach((u) => {
                if (u.previewURL) {
                    URL.revokeObjectURL(u.previewURL);
                }
            });
            UploadStore.clear();
        },
        size: "large"
    });

    // --- Drag & Drop ---
    const handleDrop = (e: DragEvent): void => {
        e.preventDefault();
        dropZone.classList.remove("drag-active");
        if (e.dataTransfer?.files) {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files, caption, uploadsDiv, submit, entityType, entityId);
        }
    };

    dropZone.addEventListener("dragover", (e: Event) => {
        e.preventDefault();
        dropZone.classList.add("drag-active");
    });
    dropZone.addEventListener("dragleave", (e: Event) => {
        e.preventDefault();
        dropZone.classList.remove("drag-active");
    });
    dropZone.addEventListener("drop", handleDrop as EventListener);

    // File selection via input
    fileInput.addEventListener("change", (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            handleFiles(
                Array.from(target.files),
                caption,
                uploadsDiv,
                submit,
                entityType,
                entityId
            );
        }
    });
}

/* ======================================================
   VALIDATION & FILE PROCESSING
====================================================== */

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
    } catch (err) {
        const error = err as Error;
        Notify(error.message, { type: "error" });
    }

    const newUploads: CustomUploadItem[] = files.map((f) => ({
        id: uid(),
        file: f,
        previewURL: URL.createObjectURL(f),
        progress: 0,
        status: "queued",
        uploading: true,
        fileType: getFileType(f),
        mediaEntity: "media",
        entityType: entityType || "media",
        entityId: entityId ? String(entityId) : "",
        extension: getFileExtension(f)
    }));

    UploadStore.uploads.push(...newUploads);
    renderUploads(uploadsDiv, submit);

    newUploads.forEach((u) => uploadFileAndTrack(u, uploadsDiv, submit));
}

/* ======================================================
   UPLOAD TRACKER
====================================================== */

async function uploadFileAndTrack(
    u: CustomUploadItem,
    uploadsDiv: HTMLElement,
    submit: HTMLElement
): Promise<void> {
    try {
        const dropData = await uploadFile(u);
        UploadStore.update(u.id, {
            status: "done",
            uploading: false,
            done: true,
            dropData,
            progress: 100
        } as Partial<CustomUploadItem>);
        Notify(`Uploaded: ${u.file.name}`, { type: "success" });
    } catch (err) {
        const error = err as Error;
        UploadStore.update(u.id, {
            status: "error",
            uploading: false,
            error: true
        } as Partial<CustomUploadItem>);
        Notify(error.message || "Upload failed", { type: "error" });
    } finally {
        renderUploads(uploadsDiv, submit);
    }
}

/* ======================================================
   SUBMIT GROUPED UPLOADS
====================================================== */

async function submitGroupedUploads(
    caption: HTMLTextAreaElement,
    uploadsDiv: HTMLElement,
    entityType: string,
    entityId: string | number,
    modal: ModalType
): Promise<void> {
    const ready = (UploadStore.uploads as CustomUploadItem[]).filter(
        (u) => u.dropData && !u.serverData
    );

    if (!ready.length) {
        Notify("No uploads ready to submit.", { type: "info" });
    }

    const captionLang = detectCaptionLang(caption.value);
    const payload: PostMediaPayload = {
        caption: caption.value,
        captionLang,
        files: ready.map((u) => ({
            filename: (u.dropData?.savedname || u.dropData?.filename || "") as string,
            extn: u.extension
        }))
    };

    try {
        const res = await postMedia(entityType, entityId, payload) as any;
        if (Array.isArray(res)) {
            ready.forEach((u, i) =>
                UploadStore.update(u.id, { serverData: res[i] } as Partial<CustomUploadItem>)
            );
            Notify("Media submitted successfully!", {
                type: "success",
                dismissible: true
            });
            modal.close?.();
        }
    } catch (err) {
        const error = err as Error;
        Notify(error.message || "Failed to submit media", { type: "error" });
    }
}

/* ======================================================
   RENDER UPLOADS
====================================================== */

function renderUploads(uploadsDiv: HTMLElement, submit: HTMLElement): void {
    const fragment = document.createDocumentFragment();
    const uploads = UploadStore.uploads as CustomUploadItem[];

    // Remove orphaned DOM nodes
    const currentIds = new Set(uploads.map((u) => u.id));
    uploadsDiv.querySelectorAll<HTMLElement>(".upload-card").forEach((el) => {
        if (!currentIds.has(el.dataset.id || "")) {
            el.remove();
        }
    });

    uploads.forEach((u) => {
        const existing = uploadsDiv.querySelector<HTMLElement>(`[data-id="${u.id}"]`);
        if (existing) {
            const bar = existing.querySelector<HTMLElement>(".upload-progress > div");
            if (bar) {
                bar.style.width = `${u.progress || 0}%`;
            }
            existing.classList.toggle("upload-error", !!u.error);
            existing.classList.toggle("upload-done", !!u.done);
            return;
        }

        const preview =
            u.fileType === "image"
                ? Imagex({ src: u.previewURL, classes: "upload-preview" })
                : createElement("video", {
                      src: u.previewURL,
                      controls: true,
                      class: "upload-preview"
                  });

        const progress = createElement("div", { class: "upload-progress" }, [
            createElement("div", {
                class: "upload-progress-bar",
                style: `width:${u.progress}%`
            })
        ]);

        const removeBtnOptions: ButtonOptions = {
            title: "Remove",
            classes: "button-secondary",
            events: {
                click: () => {
                    if (u.previewURL) {
                        URL.revokeObjectURL(u.previewURL);
                    }
                    UploadStore.remove(u.id);
                    renderUploads(uploadsDiv, submit);
                }
            }
        };

        const removeBtn = Button(removeBtnOptions);

        const card = createElement(
            "div",
            { class: "upload-card", "data-id": u.id },
            [preview, createElement("p", {}, [u.file.name]), progress, removeBtn]
        );

        fragment.append(card);
    });

    uploadsDiv.append(fragment);

    submit.style.display = uploads.some((u) => u.dropData && !u.serverData)
        ? "inline-block"
        : "none";
}