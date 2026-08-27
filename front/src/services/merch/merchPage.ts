// merchPage.ts
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { addToCart, isValidCartQuantity } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import Datex from "../../components/base/Datex.js";
import Modal from "../../components/ui/Modal.js";
import Notify from "../../components/ui/Notify.js";
import { showPaymentModal } from "../pay/pay.js";
import { confirmMerchPurchase, fetchMerchById } from "./api.js";

const MAX_CART_QUANTITY = 99;

/**
 * Normalize stock for frontend UI purposes.
 *
 * This is NOT an inventory/security check.
 * The backend must always re-check current stock.
 */
function normalizeStock(value: unknown): number {
    const stock = Number(value);
    if (!Number.isFinite(stock) || stock <= 0) {
        return 0;
    }
    return Math.floor(stock);
}

/**
 * Normalize a quantity entered by the user.
 */
function parseQuantity(value: unknown): number | null {
    const quantity = Number(value);
    if (!Number.isInteger(quantity)) {
        return null;
    }
    if (quantity < 1) {
        return null;
    }
    if (quantity > MAX_CART_QUANTITY) {
        return MAX_CART_QUANTITY;
    }
    return quantity;
}

/**
 * Keep a button disabled while a mutation is in progress.
 */
function setButtonBusy(button: HTMLButtonElement | null, busy: boolean): void {
    if (!button) {
        return;
    }
    button.disabled = busy;
}

export async function displayMerch(
    contentContainer: HTMLElement,
    merchID: string,
    isLoggedIn: boolean,
    entityType?: string,
    entityId?: string
): Promise<void> {
    contentContainer.replaceChildren();
    if (!isLoggedIn) {
        contentContainer.textContent = "Please log in to view merch details.";
        return;
    }

    const merchContainer = createElement("div", {
        class: "merch-details-container product-page",
        style: "max-width:800px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:16px;"
    }, []) as HTMLElement;

    merchContainer.appendChild(createElement("p", {}, ["Loading merch details..."]));
    contentContainer.appendChild(merchContainer);

    try {
        const resp = await fetchMerchById(merchID);
        const data = (resp?.data ?? resp) as Record<string, any>;

        if (!data?.["merchid"]) {
            merchContainer.replaceChildren(createElement("p", {
                style: "color:red;"
            }, ["Failed to fetch merch details."]));
            return;
        }

        merchContainer.replaceChildren();

        // ------------------------------------------------------------
        // STOCK
        // ------------------------------------------------------------
        const stock = normalizeStock(data["stock"]);
        const inStock = stock > 0;
        const maxQuantity = Math.min(stock, MAX_CART_QUANTITY);

        // ------------------------------------------------------------
        // TOP SECTION
        // ------------------------------------------------------------
        const topSection = createElement("div", {
            class: "product-top-section",
            style: "display:flex;flex-wrap:wrap;gap:24px;"
        }, []) as HTMLElement;

        // ------------------------------------------------------------
        // IMAGE
        // ------------------------------------------------------------
        const imgContainer = createElement("div", {
            class: "product-image-container",
            style: "flex:1 1 300px;text-align:center;"
        }, []) as HTMLElement;

        if (data["merch_pic"]) {
            const img = Imagex({
                src: resolveImagePath(EntityType.MERCH, PictureType.THUMB, data["merch_pic"]),
                alt: data["name"] || "Merch Image",
            });
            imgContainer.appendChild(img);
        } else {
            imgContainer.appendChild(createElement("div", {
                style: "width:100%;padding-top:75%;background-color:#f0f0f0;border-radius:4px;"
            }, []));
        }

        // ------------------------------------------------------------
        // DETAILS
        // ------------------------------------------------------------
        const detailsContainer = createElement("div", {
            class: "product-details-container",
            style: "flex:1 1 300px;display:flex;flex-direction:column;gap:8px;"
        }, []) as HTMLElement;

        detailsContainer.appendChild(createElement("h1", {
            style: "margin:0;font-size:1.75em;line-height:1.2;"
        }, [data["name"] || "Merchandise"]));

        const numericPrice = Number(data["price"]);
        const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
        const priceText = safePrice.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        detailsContainer.appendChild(createElement("p", {
            style: "font-size:1.5em;font-weight:bold;margin:0;color:#E53935;"
        }, [`₹${priceText}`]));

        detailsContainer.appendChild(createElement("p", {
            style: `margin:0;font-size:0.95em;color:${inStock ? "#388E3C" : "#D32F2F"};`
        }, [inStock ? `In Stock (${stock} available)` : "Out of Stock"]));

        // ------------------------------------------------------------
        // ACTIONS
        // ------------------------------------------------------------
        const actionRow = createElement("div", {
            style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;"
        }, []) as HTMLElement;

        const qtyInput = createElement("input", {
            type: "number",
            value: "1",
            min: "1",
            max: String(maxQuantity || 1),
            step: "1",
            inputmode: "numeric",
            disabled: !inStock,
            "aria-label": "Quantity",
            style: "width:60px;padding:4px;font-size:1em;border:1px solid #ccc;border-radius:4px;"
        }) as HTMLInputElement;

        // ------------------------------------------------------------
        // ADD TO CART
        // ------------------------------------------------------------
        let isAddingToCart = false;
        const addToCartBtn = Button({
            title: "Add to Cart",
            classes: "action-btn",
            styles: {
                color: "white",
                backgroundColor: "#1976D2",
                opacity: inStock ? "1" : "0.6"
            },
            events: {
                click: async (event: Event) => {
                    event.stopPropagation();
                    if (isAddingToCart || !inStock) {
                        return;
                    }
                    let qty = parseQuantity(qtyInput.value);
                    if (qty === null || !isValidCartQuantity(qty)) {
                        Notify(`Invalid quantity. Please enter 1-${Math.min(maxQuantity, MAX_CART_QUANTITY)}.`, {
                            type: "warning",
                            duration: 3000
                        });
                        return;
                    }

                    if (qty > maxQuantity) {
                        qty = maxQuantity;
                        qtyInput.value = String(qty);
                        Notify(`Only ${maxQuantity} item${maxQuantity === 1 ? "" : "s"} available.`, {
                            type: "warning",
                            duration: 3000
                        });
                        return;
                    }

                    isAddingToCart = true;
                    setButtonBusy(addToCartBtn, true);
                    try {
                        const success = await addToCart({
                            itemId: data["merchid"],
                            quantity: qty,
                            isLoggedIn: Boolean(getState("token")),
                            onCartUpdated: (response: unknown) => {
                                console.debug("Merch added to cart:", response);
                            }
                        });
                        if (!success) {
                            return;
                        }
                    } catch (error) {
                        console.error("Failed to add merch to cart:", error);
                    } finally {
                        isAddingToCart = false;
                        setButtonBusy(addToCartBtn, false);
                    }
                }
            }
        }) as HTMLButtonElement;
        addToCartBtn.disabled = !inStock;

        // ------------------------------------------------------------
        // BUY NOW
        // ------------------------------------------------------------
        let isPurchasing = false;
        const buyNowBtn = Button({
            title: "Buy Now",
            classes: "action-btn",
            styles: {
                color: "white",
                backgroundColor: "#388E3C",
                opacity: inStock ? "1" : "0.6"
            },
            events: {
                click: async (event: Event) => {
                    event.stopPropagation();
                    if (isPurchasing || !inStock) {
                        return;
                    }
                    let qty = parseQuantity(qtyInput.value);
                    if (qty === null || !isValidCartQuantity(qty)) {
                        Notify(`Invalid quantity. Please enter 1-${Math.min(maxQuantity, MAX_CART_QUANTITY)}.`, {
                            type: "warning",
                            duration: 3000
                        });
                        return;
                    }
                    if (qty > maxQuantity) {
                        qty = maxQuantity;
                        qtyInput.value = String(qty);
                        Notify(`Only ${maxQuantity} item${maxQuantity === 1 ? "" : "s"} available.`, {
                            type: "warning",
                            duration: 3000
                        });
                        return;
                    }

                    const noteInput = createElement("textarea", {
                        placeholder: "Special request (optional)",
                        rows: "3",
                        maxlength: "1000"
                    }) as HTMLTextAreaElement;

                    const modal = Modal({
                        title: `Purchase ${data["name"] || "Merchandise"}`,
                        content: createElement("div", {
                            class: "modal-form-group"
                        }, [
                            createElement("p", {}, [`Quantity: ${qty}`]),
                            createElement("label", {}, ["Note: ", noteInput])
                        ]),
                        actions: () => createElement("div", {
                            class: "modal-actions"
                        }, [
                            Button({
                                title: "Proceed to Payment",
                                classes: "buttonx primary",
                                events: {
                                    click: async () => {
                                        if (isPurchasing) {
                                            return;
                                        }
                                        const note = noteInput.value.trim();
                                        modal.close();
                                        isPurchasing = true;
                                        setButtonBusy(buyNowBtn, true);
                                        try {
                                            const paymentResult = await showPaymentModal({
                                                paymentType: "purchase",
                                                entityType: "merch",
                                                entityId: data["merchid"],
                                                entityName: data["name"]
                                            });
                                            if (!paymentResult || paymentResult.success !== true) {
                                                Notify("Payment cancelled or failed.", {
                                                    type: "warning"
                                                });
                                                return;
                                            }

                                            const targetEntityType = String(entityType || data["entity_type"] || "event");
                                            const targetEntityId = String(entityId || data["entity_id"] || "");

                                            const confirmResp = await confirmMerchPurchase(targetEntityType, targetEntityId, String(data["merchid"]), {
                                                quantity: qty,
                                                note
                                            });

                                            if (confirmResp?.success) {
                                                Notify("Merchandise purchased successfully!", {
                                                    type: "success"
                                                });
                                            } else {
                                                Notify(confirmResp?.message || "Purchase failed.", {
                                                    type: "error"
                                                });
                                            }
                                        } catch (error) {
                                            console.error("Purchase error:", error);
                                            Notify("Purchase failed. Please try again.", {
                                                type: "error"
                                            });
                                        } finally {
                                            isPurchasing = false;
                                            setButtonBusy(buyNowBtn, false);
                                        }
                                    }
                                }
                            }),
                            Button({
                                title: "Cancel",
                                classes: "buttonx",
                                events: {
                                    click: () => modal.close()
                                }
                            })
                        ])
                    });
                }
            }
        }) as HTMLButtonElement;
        buyNowBtn.disabled = !inStock;

        actionRow.append(
            createElement("label", { for: `merch-quantity-${data["merchid"]}` }, ["Qty:"]),
            qtyInput,
            addToCartBtn,
            buyNowBtn
        );
        detailsContainer.appendChild(actionRow);

        // ------------------------------------------------------------
        // DESCRIPTION
        // ------------------------------------------------------------
        if (data["description"]) {
            detailsContainer.appendChild(createElement("p", {
                style: "margin-top:12px;font-size:1em;line-height:1.4;"
            }, [String(data["description"])]));
        }

        topSection.append(imgContainer, detailsContainer);
        merchContainer.appendChild(topSection);

        // ------------------------------------------------------------
        // META INFORMATION
        // ------------------------------------------------------------
        const metaInfo = createElement("div", {
            style: "font-size:0.85em;color:#555;margin-top:24px;display:flex;flex-direction:column;gap:4px;"
        }, []) as HTMLElement;

        if (data["entity_type"] && data["entity_id"]) {
            metaInfo.appendChild(createElement("a", {
                href: `/${encodeURIComponent(String(data["entity_type"]))}/${encodeURIComponent(String(data["entity_id"]))}`,
                style: "color:#1976D2;text-decoration:none;"
            }, [`View related ${String(data["entity_type"])}`]));
        }
        if (data["created_at"]) {
            metaInfo.appendChild(createElement("p", {}, [`Created At: ${new Date(String(data["created_at"])).toLocaleString()}`]));
        }
        if (data["updatedAt"]) {
            metaInfo.appendChild(createElement("p", {}, [`Last Updated: ${Datex(String(data["updatedAt"]))}`]));
        }
        if (data["merchid"]) {
            metaInfo.appendChild(createElement("p", {}, [`Merch ID: ${data["merchid"]}`]));
        }
        merchContainer.appendChild(metaInfo);

    } catch (err) {
        merchContainer.replaceChildren(createElement("p", {
            style: "color:red;"
        }, ["An error occurred while fetching merch details."]));
        console.error("Error fetching merch details:", err);
    }
}