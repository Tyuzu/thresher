import Modal from "../components/ui/Modal.mjs";
import { createElement } from "../components/createElement.js";
import Notify from "../components/ui/Notify.mjs";
import { openCropper } from "./cropper/index.js";
import { bannerFetch } from "../api/api.js";
import { resolveImagePath } from "./imagePaths.js";
import {
    showLoadingMessage,
    removeLoadingMessage,
    capitalize
} from "../services/profile/profileHelpers.js";
import { handleError } from "./utils.js";
import Button from "../components/base/Button.js";

/* ────────── Public API ────────── */
export async function updateImageWithCrop({
    entityType,
    imageType,
    stateKey,
    previewElementId,
    pictureType,
    entityId
}) {
    const choice = await askUpdateMethod(imageType);
    if (!choice) {
        return false;
    }

    try {
        showLoadingMessage(`Updating ${imageType} picture...`);

        let payload;

        if (choice === "upload") {
            payload = await getCroppedImage(imageType);
        } else if (choice === "url") {
            payload = await getImageFromUrl(false, imageType);
        } else if (choice === "url-crop") {
            payload = await getImageFromUrl(true, imageType);
        }

        if (!payload) {
            return false;
        }

        const response = await uploadImage({
            entityType,
            entityId,
            stateKey,
            payload
        });

        // Handle dropify response: array of attachments with uppercase Key field
        const attachments = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : [];

        // Find matching attachment (key can be uppercase or lowercase from dropify)
        const attachment = attachments.find(a =>
            (a.key || a.Key) === stateKey || a.filename
        );

        if (!attachment) {
            throw new Error("Upload succeeded but no matching file returned");
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
        console.error(err);
        handleError(`Error updating ${imageType} picture.`);
        return false;
    } finally {
        removeLoadingMessage();
    }
}

/* ────────── UI Choice ────────── */
function askUpdateMethod(imageType) {
    return new Promise(resolve => {
        const content = createElement("div", { class: "vflex gap10" }, [
            createElement("p", {}, [`Update ${imageType} picture:`])
        ]);

        const uploadBtn = Button("Upload Image", "up-banner-btn", {
            click: () => resolve("upload")
        }, "btn");

        const urlBtn = Button("Use URL", "url-banner-btn", {
            click: () => resolve("url")
        }, "btn");

        const urlCropBtn = Button("Use URL + Crop", "url-crop-banner-btn", {
            click: () => resolve("url-crop")
        }, "btn");

        const cancelBtn = Button("Cancel", "cancel-banner-btn", {
            click: () => resolve(false)
        }, "btn");

        content.append(
            uploadBtn,
            urlBtn,
            urlCropBtn,
            cancelBtn
        );

        const { close } = Modal({
            title: "Update Picture",
            content
        });

        [uploadBtn, urlBtn, urlCropBtn, cancelBtn].forEach(btn =>
            btn.addEventListener("click", close, { once: true })
        );
    });
}

/* ────────── Image Sources ────────── */
async function getCroppedImage(imageType) {
    const file = await pickFile();

    if (!file) {
        return null;
    }

    return await openCropper({
        file,
        type: imageType
    });
}

/**
 * crop = false -> return remote descriptor
 * crop = true  -> download image and open cropper
 */
async function getImageFromUrl(crop = false, imageType = "") {
    const url = window.prompt("Enter image URL:");

    if (!url) {
        return null;
    }

    try {
        const parsed = new URL(url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Invalid protocol");
        }

        if (!crop) {
            return {
                type: "remote",
                url
            };
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to download image");
        }

        const blob = await response.blob();

        if (!blob.type.startsWith("image/")) {
            throw new Error("URL does not point to an image");
        }

        const file = new File(
            [blob],
            "remote-image",
            { type: blob.type }
        );

        return await openCropper({
            file,
            type: imageType
        });

    } catch (err) {
        console.error(err);

        handleError(
            crop
                ? "Unable to load image from URL"
                : "Invalid image URL"
        );

        return null;
    }
}

function pickFile() {
    return new Promise(resolve => {
        const input = createElement("input", {
            type: "file",
            accept: "image/*",
            style: "display:none"
        });

        document.body.append(input);
        input.click();

        input.addEventListener("change", () => {
            const file = input.files?.[0] || null;
            input.remove();
            resolve(file);
        }, { once: true });
    });
}

/* ────────── Upload ────────── */
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

    if (!preview || !imageName) {
        return;
    }

    preview.src =
        resolveImagePath(
            entityType,
            pictureType,
            imageName
        ) + `?t=${Date.now()}`;
}