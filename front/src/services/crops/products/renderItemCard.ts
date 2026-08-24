// renderItemCard.js
import Button from "../../../components/base/Button";
import Imagex from "../../../components/base/Imagex.js";
import {
    createElement
} from "../../../components/createElement.js";
import {
    navigate
} from "../../../routes";
import {
    resolveImagePath,
    EntityType,
    PictureType,
} from "../../../utils/imagePaths.js";
import {
    updateImageWithCrop
} from "../../../utils/bannerEditor.js";
import {
    addToCart,
    isValidCartQuantity
} from "../../cart/addToCart.js";
import {
    getState
} from "../../../state/state.js";
import {
    renderItemForm
} from "./createOrEdit.js";
const MAX_CART_QUANTITY = 99;
/**
 * Convert stock into a safe positive integer.
 *
 * The backend remains authoritative for actual inventory.
 * This only prevents obviously invalid UI behavior.
 */
function normalizeStock(value) {
    const stock = Number(value);
    if (!Number.isFinite(stock) || stock <= 0) {
        return 0;
    }
    return Math.min(Math.floor(stock), MAX_CART_QUANTITY);
}
/**
 * Safely calculate a display price.
 *
 * Pricing displayed in the browser is informational only.
 * The backend must calculate the authoritative cart price.
 */
function calculateDisplayPrice(price, discount) {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return 0;
    }
    const numericDiscount = Number(discount);
    if (!Number.isFinite(numericDiscount) || numericDiscount <= 0) {
        return numericPrice;
    }
    const safeDiscount = Math.min(Math.max(numericDiscount, 0), 100);
    return numericPrice * (1 - safeDiscount / 100);
}
export function renderItemCard(item, type, isLoggedIn, container, refresh) {
    let quantity = 1;
    let isAddingToCart = false;
    /**
     * The UI uses the item's available stock as a local upper bound.
     *
     * This is NOT an inventory security mechanism.
     * The server must re-check inventory when the cart mutation occurs.
     */
    const maxStock = normalizeStock(item.quantity);
    const quantityDisplay = createElement("span", {
        class: "quantity-value",
        "aria-live": "polite",
        "aria-label": "Selected quantity"
    },
        [String(quantity)]);
    /**
     * Quantity controls
     */
    const decrementBtn = Button("−", "", {
        click: (e) => {
            e.stopPropagation();
            if (isAddingToCart) {
                return;
            }
            if (quantity > 1) {
                quantity -= 1;
                quantityDisplay.textContent = String(quantity);
            }
        },
    }, "quantity-btn btn-minus");
    const incrementBtn = Button("+", "", {
        click: (e) => {
            e.stopPropagation();
            if (isAddingToCart) {
                return;
            }
            if (quantity < maxStock) {
                quantity += 1;
                quantityDisplay.textContent = String(quantity);
            }
        },
    }, "quantity-btn btn-plus");
    const quantityControl = createElement("div", {
        class: "quantity-control",
        role: "group",
        "aria-label": "Quantity"
    },
        [
            decrementBtn,
            quantityDisplay,
            incrementBtn
        ]);
    /**
     * Add item to cart.
     *
     * IMPORTANT:
     *
     * The cart API intentionally receives only:
     *
     *   itemId
     *   quantity
     *   isLoggedIn
     *
     * Do NOT send:
     *
     *   itemType
     *   itemName
     *   entityType
     *   entityId
     *   entityName
     *   category
     *   price
     *
     * The backend should resolve authoritative product information
     * from itemId.
     */
    const handleAdd = async (e) => {
        e.stopPropagation();
        if (isAddingToCart) {
            return;
        }
        if (maxStock <= 0) {
            return;
        }
        /**
         * Defensive frontend validation.
         *
         * The backend must perform this validation independently.
         */
        if (!isValidCartQuantity(quantity)) {
            console.error("Invalid cart quantity:", quantity);
            return;
        }
        /**
         * Make sure the requested quantity doesn't exceed the stock
         * known by this particular listing response.
         *
         * Again, the server must perform its own current inventory check.
         */
        if (quantity > maxStock) {
            console.warn("Requested quantity exceeds available stock:", {
                quantity,
                maxStock,
                itemId: item.productid
            });
            quantity = maxStock;
            quantityDisplay.textContent = String(quantity);
            return;
        }
        isAddingToCart = true;
        /**
         * Prevent repeated clicks while the mutation is in flight.
         */
        decrementBtn.disabled = true;
        incrementBtn.disabled = true;
        try {
            const success = await addToCart({
                /**
                 * This must be the canonical ID recognized by the cart API.
                 */
                itemId: item.productid,
                quantity,
                /**
                 * This is only a frontend UX hint.
                 *
                 * The backend must authenticate the actual request and
                 * determine the current user from the session/token.
                 */
                isLoggedIn: Boolean(getState("token")),
                /**
                 * addToCart() already broadcasts the global cart mutation.
                 *
                 * Keep this callback for local state synchronization only.
                 */
                onCartUpdated: (response) => {
                    /**
                     * Intentionally lightweight.
                     *
                     * The global `cart:mutated` event emitted by addToCart()
                     * contains the authoritative server response.
                     */
                    console.debug("Product added to cart:", response);
                }
            });
            /**
             * addToCart() normally handles errors itself and returns false.
             */
            if (!success) {
                return;
            }
        } catch (error) {
            /**
             * Defensive catch in case the cart module itself throws.
             */
            console.error("Failed to add item to cart:", error);
        } finally {
            isAddingToCart = false;
            decrementBtn.disabled = false;
            incrementBtn.disabled = false;
        }
    };
    /**
     * Current authenticated user.
     *
     * Used only for determining whether edit controls should be shown.
     */
    const currentUserId = getState("user").userid;
    const isCreator = Boolean(isLoggedIn) && Boolean(currentUserId) && item.userid === currentUserId;
    // ------------------------------------------------------------
    // IMAGE SECTION
    // ------------------------------------------------------------
    const imageSection = createElement("div", {
        class: "image-section"
    });
    /**
     * Resolve the best available image.
     */
    const targetImage = item.banner || (Array.isArray(item.images) ? item.images[0] : item.images);
    const image = Imagex({
        src: resolveImagePath(EntityType.PRODUCT, PictureType.THUMB, targetImage),
        alt: item.name || "Product",
        id: `product-image-${item.productid}`,
    });
    /**
     * Prevent image interaction from triggering the card navigation.
     */
    image.addEventListener("click",
        (e) => {
            e.stopPropagation();
        });
    imageSection.appendChild(image);
    /**
     * Creator-only image editing.
     */
    if (isCreator) {
        imageSection.append(Button("Edit Image", `edit-image-${item.productid}`, {
            click: (e) => {
                e.stopPropagation();
                updateImageWithCrop({
                    entityType: EntityType.PRODUCT,
                    imageType: "banner",
                    stateKey: "banner",
                    stateEntityKey: "product",
                    previewElementId: `product-image-${item.productid}`,
                    pictureType: PictureType.THUMB,
                    entityId: item.productid,
                });
            },
        }, "edit-banner-pic overlay-edit-btn"));
    }
    // ------------------------------------------------------------
    // PRICING
    // ------------------------------------------------------------
    const numericPrice = Number(item.price);
    const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
    const numericDiscount = Number(item.discount || 0);
    const hasDiscount = Number.isFinite(numericDiscount) && numericDiscount > 0;
    const discountedPrice = calculateDisplayPrice(safePrice, numericDiscount);
    const displayUnit = item.unit ? ` / ${item.unit}` : "";
    const pricingSection = createElement("div", {
        class: "card-pricing"
    },
        [
            hasDiscount ? createElement("div", {
                class: "price-row"
            },
                [
                    createElement("span", {
                        class: "current-price discounted"
                    },
                        [`₹${discountedPrice.toFixed(2)}${displayUnit}`]),
                    createElement("span", {
                        class: "original-price strike"
                    },
                        [`₹${safePrice.toFixed(2)}`]),
                    createElement("span", {
                        class: "discount-badge"
                    },
                        [`${Math.min(
                            Math.max(numericDiscount, 0),
                            100
                        )}% OFF`])
                ]) : createElement("span", {
                    class: "current-price"
                },
                    [`₹${safePrice.toFixed(2)}${displayUnit}`])
        ]);
    // ------------------------------------------------------------
    // ACTIONS
    // ------------------------------------------------------------
    const actionWrapper = createElement("div", {
        class: "card-actions"
    });
    if (maxStock > 0) {
        actionWrapper.append(createElement("div", {
            class: "quantity-row"
        },
            [
                createElement("label", {
                    class: "quantity-label"
                },
                    ["Qty:"]),
                quantityControl
            ]), Button("Add to Cart", `add-to-cart-${item.productid}`, {
                click: handleAdd
            }, "buttonx primary-action-btn"));
    } else {
        actionWrapper.append(createElement("div", {
            class: "out-of-stock-badge"
        },
            ["Out of Stock"]));
    }
    // ------------------------------------------------------------
    // CREATOR ACTIONS
    // ------------------------------------------------------------
    if (isCreator) {
        actionWrapper.append(Button("Edit Details", `edit-${type}-${item.productid}`, {
            click: (e) => {
                e.stopPropagation();
                renderItemForm(container, "edit", item, type, refresh);
            },
        }, "buttonx secondary-action-btn edit-item-btn"));
    }
    // ------------------------------------------------------------
    // CARD
    // ------------------------------------------------------------
    const cardChildren = [
        imageSection,
        createElement("div", {
            class: "card-details"
        },
            [
                createElement("div", {
                    class: "card-header-meta"
                },
                    [
                        createElement("h3", {
                            class: "item-title"
                        },
                            [
                                item.name || "Unnamed Product"
                            ]),
                        item.category ? createElement("span", {
                            class: "category-tag"
                        },
                            [
                                item.category
                            ]) : null
                    ].filter(Boolean)),
                createElement("p", {
                    class: "item-description"
                },
                    [
                        item.description || "No description provided."
                    ]),
                pricingSection
            ]),
        actionWrapper
    ];
    const card = createElement("div", {
        class: `${type}-card items-card-wrapper`
    }, cardChildren);
    /**
     * Clicking the card navigates to the product.
     *
     * Individual controls stop propagation so clicking them doesn't
     * accidentally navigate away.
     */
    card.addEventListener("click",
        () => {
            navigate(`/products/${type}/${item.productid}`);
        });
    return card;
}