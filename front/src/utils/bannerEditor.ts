import Modal from "../components/ui/Modal.js";
import { createElement } from "../components/createElement.js";
import Notify from "../components/ui/Notify.js";
import { bannerFetch } from "../api/api.js";
import { resolveImagePath, PictureType } from "./imagePaths.js";
import { SRC_URL } from "../state/state.js";
import { showLoadingMessage, removeLoadingMessage, capitalize } from "../services/profile/profileHelpers.js";
import { handleError } from "./utils.js";
import Button from "../components/base/Button.js";

/* ────────── Types & Interfaces ────────── */

export interface UpdateImageOptions {
    entityType: string;
    imageType: string;
    stateKey: string;
    stateEntityKey: string;
    previewElementId: string;
    pictureType: PictureType;
    entityId: string | number;
}

export type UpdateMethodChoice = "upload" | "url" | "url-crop" | false;

export interface RemotePayload {
    type: "remote";
    url: string;
}

export type ImagePayload = Blob | RemotePayload | null;

export interface UploadImageParams {
    entityType: string;
    entityId: string | number;
    stateKey: string;
    payload: ImagePayload;
}

interface ImageAttachment {
    key?: string;
    Key?: string;
    filename?: string;
}

/* ────────── Security & Helper Utilities ────────── */

/**
 * Validates remote image URLs to prevent basic client-side misuse/SSRF attempts.
 */
function isValidPublicUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) return false;

        const hostname = parsed.hostname.toLowerCase();
        
        // Block known loopback and local IP formats
        const forbiddenHostnames = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];
        if (forbiddenHostnames.includes(hostname)) return false;

        // Block private/link-local IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
        const isPrivateIp = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/.test(hostname);
        if (isPrivateIp) return false;

        return true;
    } catch {
        return false;
    }
}

let cropperLoader: Promise<typeof import("./cropper/index.js")> | null = null;

async function loadCropperEditor(): Promise<typeof import("./cropper/index.js")> {
    if (cropperLoader) return cropperLoader;

    cropperLoader = (async () => {
        await Promise.all([
            import("../../css/inistyles/cropper.css"),
            import("../../css/inistyles/imagecropper.css")
        ]);

        return import("./cropper/index.js");
    })();

    return cropperLoader;
}

/* ────────── Public API ────────── */

/**
 * Handles the complete flow for updating an entity image:
 * UI selection -> Image acquisition/cropping -> Server Upload -> DOM Preview update.
 */
export async function updateImageWithCrop({
    entityType,
    imageType,
    stateKey,
    stateEntityKey,
    previewElementId,
    pictureType,
    entityId
}: UpdateImageOptions): Promise<any | false> {
    const choice = await askUpdateMethod(imageType);
    if (!choice) return false;

    try {
        let payload: ImagePayload = null;

        if (choice === "upload") {
            payload = await getCroppedImage(imageType);
        } else if (choice === "url") {
            payload = await getImageFromUrl({ crop: false, imageType });
        } else if (choice === "url-crop") {
            payload = await getImageFromUrl({ crop: true, imageType });
        }

        if (!payload) return false;

        showLoadingMessage(`Uploading ${imageType} picture changes...`);

        const response = await uploadImage({
            entityType,
            entityId,
            stateKey,
            payload
        });

        const attachments: ImageAttachment[] = Array.isArray(response)
            ? response
            : Array.isArray((response as any)?.data)
                ? (response as any).data
                : [];

        const attachment = attachments.find(a =>
            (a.key || a.Key) === stateKey || a.filename
        );

        if (!attachment || !attachment.filename) {
            throw new Error("Upload succeeded but no matching file record was returned.");
        }

        updatePreview(
            previewElementId,
            entityType,
            pictureType,
            attachment.filename
        );

        Notify(
            `${capitalize(imageType)} picture updated successfully.`,
            { type: "success", duration: 3000 }
        );

        return response;

    } catch (err: any) {
        console.error(`[ImageUpdate Error]:`, err);
        handleError(err.message || `Error updating ${imageType} picture.`);
        return false;
    } finally {
        removeLoadingMessage();
    }
}

/* ────────── UI Modal Dialogs ────────── */

// export type UpdateMethodChoice = "upload" | "url" | "url-crop" | false;

function askUpdateMethod(imageType: string): Promise<UpdateMethodChoice> {
  return new Promise(resolve => {
    let modalInstance: any = null;

    const handleChoice = (action: UpdateMethodChoice) => {
      modalInstance?.close?.();
      resolve(action);
    };

    const content = createElement("div", { class: "vflex gap10" }, [
      createElement("p", {}, [`Update ${imageType} picture:`]),
      Button({
        title: "Upload Image",
        id: "up-banner-btn",
        classes: "btn",
        events: { click: () => handleChoice("upload") }
      }),
      Button({
        title: "Use URL",
        id: "url-banner-btn",
        classes: "btn",
        events: { click: () => handleChoice("url") }
      }),
      Button({
        title: "Use URL + Crop",
        id: "url-crop-banner-btn",
        classes: "btn",
        events: { click: () => handleChoice("url-crop") }
      }),
      Button({
        title: "Cancel",
        id: "cancel-banner-btn",
        classes: "btn",
        events: { click: () => handleChoice(false) }
      })
    ]);

    modalInstance = Modal({
      title: "Update Picture",
      content,
      onClose: () => resolve(false)
    });
  });
}

function promptUrlInput(): Promise<string | null> {
  return new Promise(resolve => {
    let modalInstance: any = null;

    const handleDone = (val: string | null) => {
      modalInstance?.close?.();
      resolve(val);
    };

    const input = createElement("input", {
      type: "url",
      placeholder: "https://example.com/image.jpg",
      class: "input-field",
      style: "width: 100%; margin: 10px 0;"
    }) as HTMLInputElement;

    // Submit on Enter key press
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleDone(input.value.trim());
      }
    });

    const submitBtn = Button({
      title: "Confirm",
      id: "confirm-url-btn",
      classes: "btn btn-primary",
      events: { click: () => handleDone(input.value.trim()) }
    });

    const cancelBtn = Button({
      title: "Cancel",
      id: "cancel-url-btn",
      classes: "btn",
      events: { click: () => handleDone(null) }
    });

    const content = createElement("div", { class: "vflex gap10" }, [
      createElement("label", {}, ["Enter image URL:"]),
      input,
      createElement("div", { class: "hflex gap10 justify-end" }, [cancelBtn, submitBtn])
    ]);

    modalInstance = Modal({
      title: "Image URL",
      content,
      onClose: () => resolve(null)
    });

    requestAnimationFrame(() => input.focus());
  });
}

/* ────────── Image Sourcing Helpers ────────── */

async function getCroppedImage(imageType: string): Promise<Blob | null> {
    const file = await pickFile();
    if (!file) return null;

    const { openCropper } = await loadCropperEditor();
    return openCropper({ file, type: imageType });
}

async function getImageFromUrl({ crop = false, imageType = "" } = {}): Promise<ImagePayload> {
    const url = await promptUrlInput();
    if (!url) return null;

    if (!isValidPublicUrl(url)) {
        handleError("Invalid or restricted image URL.");
        return null;
    }

    if (!crop) {
        return { type: "remote", url };
    }

    try {
        const targetProxyUrl = `${SRC_URL}/proxy/${encodeURIComponent(url)}`;
        const response = await fetch(targetProxyUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image via proxy (Status: ${response.status})`);
        }

        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) {
            throw new Error("Target resource is not a valid image format.");
        }

        const file = new File([blob], "remote-image.png", { type: blob.type });

        const { openCropper } = await loadCropperEditor();
        return await openCropper({
            file,
            type: imageType
        });

    } catch (err) {
        console.error(`[URL Fetch Error]:`, err);
        handleError(crop ? "Unable to process image from URL." : "Invalid image URL.");
        return null;
    }
}

/**
 * File picker supporting native file selection and clean event teardown.
 */
function pickFile(): Promise<File | null> {
    return new Promise(resolve => {
        const input = createElement("input", {
            type: "file",
            accept: "image/*",
            style: "display: none"
        }) as HTMLInputElement;

        let isSettled = false;

        const cleanup = (file: File | null) => {
            if (isSettled) return;
            isSettled = true;

            window.removeEventListener("focus", handleWindowFocus);
            input.remove();
            resolve(file);
        };

        const handleWindowFocus = () => {
            setTimeout(() => {
                if (!input.files || input.files.length === 0) {
                    cleanup(null);
                }
            }, 300);
        };

        input.addEventListener("change", () => {
            cleanup(input.files?.[0] || null);
        }, { once: true });

        input.addEventListener("cancel", () => cleanup(null), { once: true });
        window.addEventListener("focus", handleWindowFocus, { once: true });

        document.body.append(input);
        input.click();
    });
}

/* ────────── Network Upload ────────── */

export async function uploadImage({
    entityType,
    entityId,
    stateKey,
    payload
}: UploadImageParams): Promise<any> {
    const endpoint = "/api/v1/filedrop";
    const formData = new FormData();

    formData.append("entityType", entityType);
    formData.append("entityId", String(entityId));

    if (payload instanceof Blob) {
        formData.append(stateKey, payload, "upload.jpg");
    } else if (payload && typeof payload === "object" && payload.type === "remote") {
        formData.append("remoteUrl", payload.url);
        formData.append("remoteKey", stateKey);
    } else {
        throw new Error("Invalid payload provided for image upload.");
    }

    return bannerFetch(endpoint, "POST", formData, {});
}

/* ────────── Preview Update ────────── */

function updatePreview(
    previewElementId: string,
    entityType: string,
    pictureType: PictureType,
    imageName: string
): void {
    const preview = document.getElementById(previewElementId) as HTMLImageElement | null;
    if (!preview || !imageName) return;

    const newSrc = resolveImagePath(
        entityType,
        pictureType,
        imageName
    );

    preview.src = `${newSrc}?t=${Date.now()}`;
}