// merchAPI.ts
import Modal from "../../components/ui/Modal.js";
import Notify from "../../components/ui/Notify.js";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import {
    createMerchItem,
    deleteMerchItem,
    fetchMerchDetails,
    updateMerchItem
} from "./api.js";

// --- Add Merchandise ---
async function addMerchandise(
    entityType: string,
    eventId: string,
    merchList: HTMLElement
): Promise<void> {
    const nameInput = document.getElementById("merch-name") as HTMLInputElement | null;
    const priceInput = document.getElementById("merch-price") as HTMLInputElement | null;
    const stockInput = document.getElementById("merch-stock") as HTMLInputElement | null;
    const discountInput = document.getElementById("merch-discount") as HTMLInputElement | null;
    const imageInput = document.getElementById("merch-image") as HTMLInputElement | null;

    const name = nameInput?.value.trim() || "";
    const price = parseFloat(priceInput?.value || "");
    const stock = parseInt(stockInput?.value || "", 10);
    const discount = parseFloat(discountInput?.value || "0");
    const imageFile = imageInput?.files?.[0];

    // ---------------------------------
    // VALIDATION
    // ---------------------------------
    if (!name || Number.isNaN(price) || Number.isNaN(stock)) {
        Notify("Please fill in all fields correctly.", {
            type: "error"
        });
        return;
    }

    if (imageFile && !imageFile.type.startsWith("image/")) {
        Notify("Please upload a valid image file.", {
            type: "error"
        });
        return;
    }

    try {
        let uploadedImage: { filename?: string; key?: string } | null = null;

        // ---------------------------------
        // IMAGE UPLOAD
        // ---------------------------------
        if (imageFile) {
            Notify("Uploading image...", {
                type: "info",
                duration: 2000
            });

            uploadedImage = await uploadFile({
                id: uid(),
                file: imageFile,
                entityType: "merch",
                entityId: String(eventId)
            });

            if (!uploadedImage?.filename && !uploadedImage?.key) {
                throw new Error("Image upload failed.");
            }
        }

        // ---------------------------------
        // PAYLOAD
        // ---------------------------------
        const payload = {
            name,
            price,
            discount,
            stock,
            merch_pic: uploadedImage?.filename || uploadedImage?.key || ""
        };

        // ---------------------------------
        // API
        // ---------------------------------
        const resp = await createMerchItem(entityType, eventId, payload);

        if (!resp?.data?.merchid) {
            throw new Error(resp?.message || "Invalid server response.");
        }

        // ---------------------------------
        // SUCCESS
        // ---------------------------------
        Notify(resp.message || "Merchandise added successfully.", {
            type: "success",
            duration: 3000
        });

        displayNewMerchandise(resp.data as any, merchList);
        clearMerchForm();

    } catch (err: unknown) {
        console.error("Error adding merchandise:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        Notify(`Error adding merchandise: ${errorMessage}`, {
            type: "error"
        });
    }
}

// --- Clear Form ---
function clearMerchForm(): void {
    const formContainer = document.getElementById("edittabs");
    if (formContainer) {
        formContainer.replaceChildren();
    }
}

// --- Delete Merchandise ---
async function deleteMerch(entityType: string, merchId: string, eventId: string): Promise<void> {
    if (!confirm("Are you sure you want to delete this merchandise?")) {
        return;
    }
    try {
        const resp = await deleteMerchItem(entityType, eventId, merchId);
        if (resp.success) {
            Notify("Merchandise deleted successfully!", { type: "success" });
            const merchItem = document.getElementById(`merch-${merchId}`);
            if (merchItem) {
                merchItem.remove();
            }
        } else {
            Notify(`Failed to delete merchandise: ${resp.message}`, { type: "error" });
        }
    } catch (err: unknown) {
        console.error("Error deleting merchandise:", err);
        Notify("An error occurred while deleting the merchandise.", { type: "error" });
    }
}

// --- Edit Merchandise ---
async function editMerchForm(entityType: string, merchId: string, eventId: string): Promise<void> {
    try {
        const resp = await fetchMerchDetails(entityType, eventId, merchId);
        const data = resp?.data ?? resp;
        if (!data || typeof data !== "object") {
            throw new Error("Merchandise not found.");
        }

        const form = createElement("form", { id: "edit-merch-form" }) as HTMLFormElement;
        const fields = [
            { label: "Name:", type: "text", id: "merchName", value: String((data as any).name ?? ""), required: true },
            { label: "Price:", type: "number", id: "merchPrice", value: Number((data as any).price ?? 0), required: true, step: 0.01 },
            { label: "Discount (%)", type: "number", id: "merch-discount", value: Number((data as any).discount ?? 0), step: 0.01, min: 0, max: 100 },
            { label: "Stock:", type: "number", id: "merchStock", value: Number((data as any).stock ?? 0), required: true }
        ];
        fields.forEach(f => form.appendChild(createFormGroup(f)));

        const submitBtn = Button({
            title: "Update Merchandise",
            classes: "buttonx",
            events: {
                click: () => {}
            },
            ...({ type: "submit" } as any)
        });
        form.appendChild(submitBtn);

        const modalInstance = Modal({ title: "Edit Merchandise", content: form });
        const closeModal = modalInstance.close;

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const nameEl = form.querySelector("#merchName") as HTMLInputElement;
            const priceEl = form.querySelector("#merchPrice") as HTMLInputElement;
            const discountEl = form.querySelector("#merch-discount") as HTMLInputElement;
            const stockEl = form.querySelector("#merchStock") as HTMLInputElement;

            const merchData = {
                name: nameEl?.value || "",
                price: parseFloat(priceEl?.value || "0"),
                discount: parseFloat(discountEl?.value || "0"),
                stock: parseInt(stockEl?.value || "0", 10)
            };
            try {
                const updateResp = await updateMerchItem(entityType, eventId, merchId, merchData);
                if (updateResp.success) {
                    Notify("Merchandise updated successfully!", { type: "success" });
                    closeModal();
                } else {
                    Notify(`Failed to update merchandise: ${updateResp.message}`, { type: "error" });
                }
            } catch (err: unknown) {
                console.error("Error updating merchandise:", err);
                Notify("An error occurred while updating the merchandise.", { type: "error" });
            }
        });
    } catch (err: unknown) {
        console.error("Error fetching merchandise details:", err);
        Notify("An error occurred while fetching the merchandise details.", { type: "error" });
    }
}

// --- Display New Merchandise Item ---
function displayNewMerchandise(merchData: { merchid: string | number; name: string; price: number; stock: number; merch_pic?: string }, merchList: HTMLElement): void {
    const item = createElement("div", { class: "merch-item", id: `merch-${merchData.merchid}` }) as HTMLElement;
    item.append(
        createElement("h3", {}, [merchData.name]),
        createElement("p", {}, [`Price: $${Number(merchData.price).toFixed(2)}`]),
        createElement("p", {}, [`Available: ${merchData.stock}`])
    );
    if (merchData.merch_pic) {
        const img = Imagex({
            src: resolveImagePath(EntityType.MERCH, PictureType.THUMB, merchData.merch_pic),
            alt: merchData.name,
            loading: "lazy"
        });
        item.appendChild(img);
    }
    merchList.prepend(item);
}

export {
    addMerchandise,
    clearMerchForm,
    deleteMerch,
    editMerchForm,
    displayNewMerchandise
};