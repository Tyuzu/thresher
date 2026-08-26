import MenuCard from "../../components/ui/MenuCard.js";
import Button from "../../components/base/Button.js";
import {
    type MenuItem as ApiMenuItem,
    type ApiResponse as ApiMenuResponse,
    type StockResponse as ApiStockResponse,
    fetchMenuByPlace,
    fetchMenuItem,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getMenuStock,
    confirmMenuPurchase
} from "./api.js";
import { createElement } from "../../components/createElement.js";
import Modal, { ModalResult } from "../../components/ui/Modal.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import Notify from "../../components/ui/Notify.js";
import { createFormGroup, FormGroupConfig } from "../../components/form/createFormGroupEnhanced.js";
import { uploadFile, MediaUploadResult } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import { showPaymentModal } from "../pay/pay.js";

/* =========================
   TYPES & INTERFACES
========================= */


export interface PaymentResult {
    success: boolean;
    [key: string]: unknown;
}

/* =========================
   FUNCTIONS
========================= */

/** Add a menu item */
async function addMenu(
    form: HTMLFormElement,
    placeId: string | number,
    menuList: HTMLElement
): Promise<void> {
    const nameInput = form.querySelector<HTMLInputElement>("#menu-name");
    const priceInput = form.querySelector<HTMLInputElement>("#menu-price");
    const stockInput = form.querySelector<HTMLInputElement>("#menu-stock");
    const discountInput = form.querySelector<HTMLInputElement>("#menu-discount");
    const imageInput = form.querySelector<HTMLInputElement>("#menu-image");

    const name = nameInput?.value.trim() || "";
    const price = parseFloat(priceInput?.value || "");
    const stock = parseInt(stockInput?.value || "", 10);
    const discount = parseFloat(discountInput?.value || "0");
    const imageFile = imageInput?.files?.[0];

    // Validation
    if (!name || Number.isNaN(price) || Number.isNaN(stock)) {
        Notify("Please fill in all fields correctly.", { type: "error" });
        return;
    }

    if (imageFile && !imageFile.type.startsWith("image/")) {
        Notify("Please upload a valid image file.", { type: "error" });
        return;
    }

    try {
        let uploadedImage: MediaUploadResult | null = null;

        // Image Upload
        if (imageFile) {
            Notify("Uploading image...", { type: "info", duration: 2000 });

            uploadedImage = await uploadFile({
                id: uid(),
                file: imageFile,
                entityType: "place",
                entityId: String(placeId)
            });

            if (!uploadedImage?.filename && !uploadedImage?.key) {
                throw new Error("Image upload failed.");
            }
        }

        const payload = {
            name,
            price,
            discount,
            stock,
            menu_pic: uploadedImage?.filename || uploadedImage?.key || ""
        };

        const response = await createMenuItem(placeId, payload);

        if (response?.data?.menuid) {
            Notify("Menu added successfully!", {
                type: "success",
                duration: 3000,
                dismissible: true
            });

            menuList.prepend(createMenuCard(response.data, true, true, placeId));
            form.reset();
        } else {
            throw new Error(response?.message || "Unknown server error");
        }
    } catch (error) {
        const err = error as Error;
        console.error("Error adding Menu:", err);
        Notify(`Error adding Menu: ${err.message}`, { type: "error" });
    }
}

/** Add Menu Form Modal */
function addMenuForm(placeId: string | number, menuList: HTMLElement): void {
    const form = createElement("form", { id: "add-menu-form", class: "create-section" }) as HTMLFormElement;

    const fields: FormGroupConfig[] = [
        { label: "Menu Name", type: "text", id: "menu-name", name: "name", placeholder: "Menu Name", required: true },
        { label: "Price", type: "number", id: "menu-price", name: "price", placeholder: "Price", required: true, additionalProps: { min: 0, step: "0.01" } },
        { label: "Discount (%)", type: "number", id: "menu-discount", name: "discount", placeholder: "e.g. 10", additionalProps: { min: 0, max: 100, step: "0.01" } },
        { label: "Stock Available", type: "number", id: "menu-stock", name: "stock", placeholder: "Stock Available", required: true, additionalProps: { min: 0 } },
        { label: "Menu Image", type: "file", id: "menu-image", name: "image", accept: "image/*" }
    ];

    fields.forEach((f) => form.appendChild(createFormGroup(f)));

    let modalRef: ModalResult | null = null;

    modalRef = Modal({
        title: "Add Menu",
        content: form,
        size: "medium",
        actions: () => {
            const addButton = Button({
                title: "Add Menu",
                type: "submit",
                classes: "buttonx",
                events: {
                    click: () => form.requestSubmit()
                }
            });

            const cancelButton = Button({
                title: "Cancel",
                type: "button",
                classes: "buttonx",
                events: {
                    click: () => modalRef?.close()
                }
            });

            return createElement("div", { class: "modal-action-group" }, [addButton, cancelButton]);
        }
    });

    form.addEventListener("submit", async (e: Event) => {
        e.preventDefault();
        await addMenu(form, placeId, menuList);
        modalRef?.close();
    });
}

/** Delete a menu item */
async function deleteMenu(menuId: string | number, placeId: string | number): Promise<void> {
    if (!confirm("Are you sure you want to delete this Menu?")) {
        return;
    }

    try {
        const response = await deleteMenuItem(placeId, menuId);
        if (response.success) {
            Notify("Menu deleted successfully!", { type: "success", duration: 3000, dismissible: true });
            const menuItem = document.getElementById(`menu-${menuId}`);
            menuItem?.remove();
        } else {
            Notify(`Failed to delete Menu: ${response?.message || "Unknown error"}`, { type: "error" });
        }
    } catch (error) {
        const err = error as Error;
        console.error(err);
        Notify(`Error deleting Menu: ${err.message}`, { type: "error" });
    }
}

/** Create a MenuCard element */
function createMenuCard(
    menu: ApiMenuItem,
    isCreator: boolean,
    isLoggedIn: boolean,
    placeId: string | number
): HTMLElement {
    return MenuCard({
        name: menu.name,
        price: menu.price,
        discount: menu.discount || 0,
        image: resolveImagePath(EntityType.MENU, PictureType.THUMB, menu.menu_pic),
        stock: menu.stock,
        isCreator,
        isLoggedIn,
        onBuy: () => promptMenuNote(menu, placeId),
        onEdit: () => editMenuForm(menu.menuid, placeId),
        onDelete: () => deleteMenu(menu.menuid, placeId)
    }) as HTMLElement;
}

/** Edit Menu Form Modal */
async function editMenuForm(menuId: string | number, placeId: string | number): Promise<void> {
    try {
        const menu = await fetchMenuItem(placeId, menuId);
        const form = createElement("form", { id: "edit-menu-form" }) as HTMLFormElement;

        const fields: FormGroupConfig[] = [
            { label: "Menu Name", type: "text", id: "menu-name", name: "name", value: menu.name, required: true },
            { label: "Price", type: "number", id: "menu-price", name: "price", value: menu.price, required: true, additionalProps: { min: 0, step: "0.01" } },
            { label: "Discount (%)", type: "number", id: "menu-discount", name: "discount", value: menu.discount || 0, additionalProps: { min: 0, max: 100, step: "0.01" } },
            { label: "Stock Available", type: "number", id: "menu-stock", name: "stock", value: menu.stock, required: true, additionalProps: { min: 0 } }
        ];

        fields.forEach((f) => form.appendChild(createFormGroup(f)));

        let modalRef: ModalResult | null = null;

        modalRef = Modal({
            title: "Edit Menu",
            content: form,
            size: "medium",
            actions: () => {
                const submitButton = Button({
                    title: "Update Menu",
                    type: "submit",
                    classes: "buttonx",
                    events: {
                        click: () => form.requestSubmit()
                    }
                });

                const cancelButton = Button({
                    title: "Cancel",
                    type: "button",
                    classes: "buttonx",
                    events: {
                        click: () => modalRef?.close()
                    }
                });

                return createElement("div", { class: "modal-action-group" }, [submitButton, cancelButton]);
            }
        });

        form.addEventListener("submit", async (e: Event) => {
            e.preventDefault();
            const nameInput = form.querySelector<HTMLInputElement>("#menu-name");
            const priceInput = form.querySelector<HTMLInputElement>("#menu-price");
            const discountInput = form.querySelector<HTMLInputElement>("#menu-discount");
            const stockInput = form.querySelector<HTMLInputElement>("#menu-stock");

            const updatedMenu = {
                name: nameInput?.value || "",
                price: parseFloat(priceInput?.value || "0"),
                discount: parseFloat(discountInput?.value || "0"),
                stock: parseInt(stockInput?.value || "0", 10)
            };

            try {
                const res = await updateMenuItem(placeId, menuId, updatedMenu);

                if (res.success) {
                    Notify("Menu updated successfully!", { type: "success", duration: 3000 });
                    modalRef?.close();
                } else {
                    Notify(`Failed to update menu: ${res.message}`, { type: "error" });
                }
            } catch (err) {
                const error = err as Error;
                Notify(`Error updating menu: ${error.message}`, { type: "error" });
            }
        });
    } catch (err) {
        const error = err as Error;
        Notify(`Failed to fetch menu: ${error.message}`, { type: "error" });
    }
}

/** Display list of menu items */
export async function displayMenu(
    container: HTMLElement,
    placeId: string | number,
    isCreator: boolean,
    isLoggedIn: boolean
): Promise<HTMLElement | void> {
    container.replaceChildren();
    const menuList = createElement("div", { class: "hvflex menulist" });
    container.appendChild(menuList);

    const menuData = await fetchMenuByPlace(placeId);

    if (isCreator) {
        const addBtn = Button({
            title: "Add Menu",
            id: "add-menu-btn",
            classes: "buttonx",
            events: {
                click: () => addMenuForm(placeId, menuList)
            }
        });
        container.prepend(addBtn);
    }

    if (!Array.isArray(menuData) || menuData.length === 0) {
        return menuList.appendChild(createElement("p", {}, ["No Menu available for this place."]));
    }

    menuData.forEach((menu) => menuList.appendChild(createMenuCard(menu, isCreator, isLoggedIn, placeId)));
}

/** Prompt quantity and optional note, then payment */
async function promptMenuNote(menu: ApiMenuItem, placeId: string | number): Promise<void> {
    const quantityInput = createElement("input", { type: "number", min: 1, value: 1 }) as HTMLInputElement;
    const noteInput = createElement("textarea", {
        rows: 3,
        placeholder: "Special request (optional)"
    }) as HTMLTextAreaElement;

    const wrapper = createElement("div", { class: "modal-form-group" }, [
        createElement("label", {}, ["Quantity: ", quantityInput]),
        createElement("label", {}, ["Note: ", noteInput])
    ]);

    let modalRef: ModalResult | null = null;

    const executePurchase = async (): Promise<void> => {
        const quantity = parseInt(quantityInput.value, 10);
        const note = noteInput.value.trim();

        if (!Number.isInteger(quantity) || quantity < 1) {
            Notify("⚠️ Please enter a valid quantity.", { type: "warning" });
            return;
        }

        try {
            const { stock } = await getMenuStock(placeId, menu.menuid);

            if (stock <= 0) {
                Notify("❌ Out of stock.", { type: "warning" });
                return;
            }

            if (quantity > stock) {
                Notify(`⚠️ Only ${stock} available.`, { type: "warning" });
                return;
            }

            modalRef?.close();

            const paymentResult = (await showPaymentModal({
                paymentType: "purchase",
                entityType: "menu",
                entityId: menu.menuid,
                entityName: menu.name
            })) as PaymentResult | undefined;

            if (!paymentResult || paymentResult.success !== true) {
                Notify("Payment was cancelled or failed.", { type: "warning" });
                return;
            }

            const res = await confirmMenuPurchase(placeId, menu.menuid, { quantity, note });

            if (res.success) {
                Notify("Menu purchased successfully!", { type: "success" });
            } else {
                Notify(res.message || "Purchase failed.", { type: "error" });
            }
        } catch (err) {
            const error = err as Error;
            console.error(error);
            Notify(`Error: ${error.message}`, { type: "error" });
        }
    };

    modalRef = Modal({
        title: `Purchase: ${menu.name}`,
        content: wrapper,
        onConfirm: executePurchase,
        actions: () =>
            Button({
                title: "Next",
                classes: "buttonx",
                events: {
                    click: executePurchase
                }
            })
    });
}