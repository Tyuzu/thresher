import "../../css/inistyles/cropper.css";
import "../../css/inistyles/imagecropper1.css";
import Modal from "../components/ui/Modal.mjs";
import { createElement } from "../components/createElement.js";
import Notify from "../components/ui/Notify.mjs";
import { openCropper } from "./cropper/index.js";
import { bannerFetch } from "../api/api.js";
import { resolveImagePath } from "./imagePaths.js";
import { SRC_URL } from "../state/state.js";
import { showLoadingMessage, removeLoadingMessage, capitalize } from "../services/profile/profileHelpers.js";
import { handleError } from "./utils.js";
import Button from "../components/base/Button.js";

/* ────────── Security & Helper Utilities ────────── */

/**
 * Validates remote image URLs to prevent basic client-side misuse/SSRF attempts.
 */
function isValidPublicUrl(rawUrl) {
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

/* ────────── Public API ────────── */

/**
 * Handles the complete flow for updating an entity image:
 * UI selection -> Image acquisition/cropping -> Server Upload -> DOM Preview update.
 */
export async function updateImageWithCrop({
    entityType,
    imageType,
    stateKey,
    previewElementId,
    pictureType,
    entityId
}) {
    const choice = await askUpdateMethod(imageType);
    if (!choice) return false;

    try {
        let payload = null;

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

        const attachments = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : [];

        const attachment = attachments.find(a =>
            (a.key || a.Key) === stateKey || a.filename
        );

        if (!attachment) {
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

    } catch (err) {
        console.error(`[ImageUpdate Error]:`, err);
        handleError(err.message || `Error updating ${imageType} picture.`);
        return false;
    } finally {
        removeLoadingMessage();
    }
}

/* ────────── UI Modal Dialogs ────────── */

function askUpdateMethod(imageType) {
    return new Promise(resolve => {
        let modalInstance = null;

        const handleChoice = (action) => {
            modalInstance?.close?.();
            resolve(action);
        };

        const content = createElement("div", { class: "vflex gap10" }, [
            createElement("p", {}, [`Update ${imageType} picture:`]),
            Button("Upload Image", "up-banner-btn", { click: () => handleChoice("upload") }, "btn"),
            Button("Use URL", "url-banner-btn", { click: () => handleChoice("url") }, "btn"),
            Button("Use URL + Crop", "url-crop-banner-btn", { click: () => handleChoice("url-crop") }, "btn"),
            Button("Cancel", "cancel-banner-btn", { click: () => handleChoice(false) }, "btn")
        ]);

        modalInstance = Modal({
            title: "Update Picture",
            content,
            onClose: () => resolve(false)
        });
    });
}

function promptUrlInput() {
    return new Promise(resolve => {
        let modalInstance = null;

        const handleDone = (val) => {
            modalInstance?.close?.();
            resolve(val);
        };

        const input = createElement("input", {
            type: "url",
            placeholder: "https://example.com/image.jpg",
            class: "input-field",
            style: "width: 100%; margin: 10px 0;"
        });

        // Submit on Enter key press
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleDone(input.value.trim());
            }
        });

        const submitBtn = Button("Confirm", "confirm-url-btn", {
            click: () => handleDone(input.value.trim())
        }, "btn btn-primary");

        const cancelBtn = Button("Cancel", "cancel-url-btn", {
            click: () => handleDone(null)
        }, "btn");

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

async function getCroppedImage(imageType) {
    const file = await pickFile();
    if (!file) return null;

    return openCropper({ file, type: imageType });
}

async function getImageFromUrl({ crop = false, imageType = "" } = {}) {
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
function pickFile() {
    return new Promise(resolve => {
        const input = createElement("input", {
            type: "file",
            accept: "image/*",
            style: "display: none"
        });

        let isSettled = false;

        const cleanup = (file) => {
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
}) {
    const endpoint = "/api/v1/filedrop";
    const formData = new FormData();

    formData.append("entityType", entityType);
    formData.append("entityId", entityId);

    if (payload instanceof Blob) {
        formData.append(stateKey, payload, "upload.jpg");
    } else if (payload?.type === "remote") {
        formData.append("remoteUrl", payload.url);
        formData.append("remoteKey", stateKey);
    } else {
        throw new Error("Invalid payload provided for image upload.");
    }

    return bannerFetch(endpoint, "POST", formData);
}

/* ────────── Preview Update ────────── */

function updatePreview(
    previewElementId,
    entityType,
    pictureType,
    imageName
) {
    const preview = document.getElementById(previewElementId);
    if (!preview || !imageName) return;

    const newSrc = resolveImagePath(
        entityType,
        pictureType,
        imageName
    );

    preview.src = `${newSrc}?t=${Date.now()}`;
}