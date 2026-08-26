// displayPlaceProducts.ts

import { showLoading, showError } from "./helpers.js";
import { apiFetch } from "../../../api/api.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Product {
    productid: string | number;
    name: string;
    price: number | string;
    [key: string]: any;
}

interface FormFieldConfig {
    name: string;
    placeholder: string;
    value?: string | number;
    type?: string;
}

export async function displayPlaceProducts(
    container: HTMLElement,
    placeId: string | number,
    isCreator: boolean,
    isLoggedIn: boolean
): Promise<void> {
    container.textContent = "";
    showLoading(container);

    try {
        const products = (await apiFetch(`/place/${placeId}/products`, "GET")) as Product[];
        container.textContent = "";
        container.appendChild(createElement("h3", {}, ["Products"]));

        const section = createElement("div", { class: "product-section" }) as HTMLElement;
        products.forEach(product => 
            section.appendChild(renderProduct(product, placeId, isCreator, isLoggedIn, container))
        );
        container.appendChild(section);

        if (isCreator) {
            const addBtn = createButton("Add Product", async function () {
                const form = createProductForm(
                    [
                        { name: "name", placeholder: "Name", type: "text" },
                        { name: "price", placeholder: "Price", type: "number" }
                    ],
                    async (data, _formEl) => {
                        await apiFetch(`/place/${placeId}/products`, "POST", JSON.stringify(data), {
                            headers: { "Content-Type": "application/json" }
                        });
                        displayPlaceProducts(container, placeId, isCreator, isLoggedIn);
                    },
                    () => {
                        container.removeChild(form);
                        addBtn.disabled = false;
                    }
                );
                container.appendChild(form);
                addBtn.disabled = true;
            }) as HTMLButtonElement;
            container.appendChild(addBtn);
        }

    } catch (_err) {
        container.textContent = "";
        showError(container, "Products unavailable.");
    }
}

function renderProduct(
    item: Product,
    placeId: string | number,
    isCreator: boolean,
    isLoggedIn: boolean,
    container: HTMLElement
): HTMLElement {
    const itemDiv = createElement("div", { class: "product-item" }, [
        createElement("h4", {}, [item.name]),
        createElement("p", {}, [`Price: ₹${item.price}`])
    ]) as HTMLElement;

    if (isLoggedIn) {
        itemDiv.appendChild(createButton("Buy", async () => {
            try {
                await apiFetch(`/place/${placeId}/products/${item.productid}/buy`, "POST");
                alert(`Purchased ${item.name}`);
            } catch (e: any) {
                alert(`Purchase failed: ${e.message}`);
            }
        }));
    }

    if (isCreator) {
        const originalClone = itemDiv.cloneNode(true) as HTMLElement;

        const editBtn = createButton("Edit", () => {
            const form = createProductForm(
                [
                    { name: "name", placeholder: "Name", value: item.name, type: "text" },
                    { name: "price", placeholder: "Price", value: item.price, type: "number" }
                ],
                async (data, _formEl) => {
                    await apiFetch(`/place/${placeId}/products/${item.productid}`, "PUT", JSON.stringify(data), {
                        headers: { "Content-Type": "application/json" }
                    });
                    displayPlaceProducts(container, placeId, isCreator, isLoggedIn);
                },
                () => {
                    itemDiv.replaceChildren(...originalClone.childNodes);
                }
            );
            itemDiv.replaceChildren(form);
        });

        const deleteBtn = createButton("Delete", async () => {
            if (!confirm(`Delete product "${item.name}"?`)) {
                return;
            }
            try {
                await apiFetch(`/place/${placeId}/products/${item.productid}`, "DELETE");
                displayPlaceProducts(container, placeId, isCreator, isLoggedIn);
            } catch (e: any) {
                alert(`Delete failed: ${e.message}`);
            }
        });

        itemDiv.appendChild(editBtn);
        itemDiv.appendChild(deleteBtn);
    }

    return itemDiv;
}

function createButton(label: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.type = "button";
    btn.addEventListener("click", onClick);
    return btn;
}

function createElement(tag: string, attrs: Record<string, string> = {}, children: (string | Node)[] = []): HTMLElement {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
        el.setAttribute(key, val);
    }
    for (const child of children) {
        el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return el;
}

function createProductForm(
    fields: FormFieldConfig[],
    onSubmit: (data: Record<string, string>, form: HTMLFormElement) => void,
    onCancel?: (form: HTMLFormElement) => void
): HTMLFormElement {
    const form = document.createElement("form");
    form.className = "inline-form";

    fields.forEach(({ name, placeholder, value = "", type = "text" }) => {
        const input = document.createElement("input");
        input.name = name;
        input.type = type;
        input.placeholder = placeholder;
        input.value = String(value);
        input.required = true;
        form.appendChild(input);
    });

    form.appendChild(createButton("Save", (e) => {
        e.preventDefault();
        const data: Record<string, string> = Object.fromEntries(
            fields.map(({ name }) => [name, (form.elements.namedItem(name) as HTMLInputElement)?.value || ""])
        );
        onSubmit(data, form);
    }));

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => onCancel?.(form));
    form.appendChild(cancelBtn);

    return form;
}