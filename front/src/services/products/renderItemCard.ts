import Button from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/navigate.js";
import {
  resolveImagePath,
  EntityType,
  PictureType,
} from "../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import { addToCart, isValidCartQuantity } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";
import { renderItemForm } from "./createOrEdit.js";
import { FarmItem, ItemType, UserState } from "./types.js";

const MAX_CART_QUANTITY = 99;

function normalizeStock(value: unknown): number {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock <= 0) {
    return 0;
  }
  return Math.min(Math.floor(stock), MAX_CART_QUANTITY);
}

function calculateDisplayPrice(price: unknown, discount: unknown): number {
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

export function renderItemCard(
  item: FarmItem,
  type: ItemType,
  isLoggedIn: boolean,
  container: HTMLElement,
  refresh: () => void
): HTMLElement {
  let quantity = 1;
  let isAddingToCart = false;

  const maxStock = normalizeStock(item.quantity);
  const quantityDisplay = createElement(
    "span",
    {
      class: "quantity-value",
      "aria-live": "polite",
      "aria-label": "Selected quantity"
    },
    [String(quantity)]
  );

  const decrementBtn = Button({
    title: "−",
    classes: "quantity-btn btn-minus",
    events: {
      click: (e: Event) => {
        e.stopPropagation();
        if (isAddingToCart) return;
        if (quantity > 1) {
          quantity -= 1;
          quantityDisplay.textContent = String(quantity);
        }
      },
    },
  }) as HTMLButtonElement;

  const incrementBtn = Button({
    title: "+",
    classes: "quantity-btn btn-plus",
    events: {
      click: (e: Event) => {
        e.stopPropagation();
        if (isAddingToCart) return;
        if (quantity < maxStock) {
          quantity += 1;
          quantityDisplay.textContent = String(quantity);
        }
      },
    },
  }) as HTMLButtonElement;

  const quantityControl = createElement(
    "div",
    {
      class: "quantity-control",
      role: "group",
      "aria-label": "Quantity"
    },
    [decrementBtn, quantityDisplay, incrementBtn]
  );

  const handleAdd = async (e: Event): Promise<void> => {
    e.stopPropagation();
    if (isAddingToCart || maxStock <= 0) return;

    if (!isValidCartQuantity(quantity)) {
      console.error("Invalid cart quantity:", quantity);
      return;
    }

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
    decrementBtn.disabled = true;
    incrementBtn.disabled = true;

    try {
      const success = await addToCart({
        itemId: item.productid,
        quantity,
        isLoggedIn: Boolean(getState("token")),
        onCartUpdated: (response: unknown) => {
          console.debug("Product added to cart:", response);
        }
      });

      if (!success) return;
    } catch (error) {
      console.error("Failed to add item to cart:", error);
    } finally {
      isAddingToCart = false;
      decrementBtn.disabled = false;
      incrementBtn.disabled = false;
    }
  };

  const user = getState("user") as UserState | undefined;
  const currentUserId = user?.userid;
  const isCreator = Boolean(isLoggedIn) && Boolean(currentUserId) && item.userid === currentUserId;

  // IMAGE SECTION
  const imageSection = createElement("div", { class: "image-section" });
  const targetImage = item.banner || (Array.isArray(item.images) ? item.images[0] : item.images);

  const image = Imagex({
    src: resolveImagePath(EntityType.PRODUCT, PictureType.THUMB, targetImage),
    alt: item.name || "Product",
    id: `product-image-${item.productid}`,
  });

  image.addEventListener("click", (e: MouseEvent) => e.stopPropagation());
  imageSection.appendChild(image);

  if (isCreator) {
    imageSection.append(
      Button({
        title: "Edit Image",
        id: `edit-image-${item.productid}`,
        classes: "edit-banner-pic overlay-edit-btn",
        events: {
          click: (e: Event) => {
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
        },
      })
    );
  }

  // PRICING
  const numericPrice = Number(item.price);
  const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
  const numericDiscount = Number(item.discount || 0);
  const hasDiscount = Number.isFinite(numericDiscount) && numericDiscount > 0;
  const discountedPrice = calculateDisplayPrice(safePrice, numericDiscount);
  const displayUnit = item.unit ? ` / ${item.unit}` : "";

  const pricingSection = createElement(
    "div",
    { class: "card-pricing" },
    [
      hasDiscount
        ? createElement(
            "div",
            { class: "price-row" },
            [
              createElement("span", { class: "current-price discounted" }, [`₹${discountedPrice.toFixed(2)}${displayUnit}`]),
              createElement("span", { class: "original-price strike" }, [`₹${safePrice.toFixed(2)}`]),
              createElement("span", { class: "discount-badge" }, [`${Math.min(Math.max(numericDiscount, 0), 100)}% OFF`])
            ]
          )
        : createElement("span", { class: "current-price" }, [`₹${safePrice.toFixed(2)}${displayUnit}`])
    ]
  );

  // ACTIONS
  const actionWrapper = createElement("div", { class: "card-actions" });

  if (maxStock > 0) {
    actionWrapper.append(
      createElement("div", { class: "quantity-row" }, [
        createElement("label", { class: "quantity-label" }, ["Qty:"]),
        quantityControl
      ]),
      Button({
        title: "Add to Cart",
        id: `add-to-cart-${item.productid}`,
        classes: "buttonx primary-action-btn",
        events: { click: handleAdd },
      })
    );
  } else {
    actionWrapper.append(createElement("div", { class: "out-of-stock-badge" }, ["Out of Stock"]));
  }

  if (isCreator) {
    actionWrapper.append(
      Button({
        title: "Edit Details",
        id: `edit-${type}-${item.productid}`,
        classes: "buttonx secondary-action-btn edit-item-btn",
        events: {
          click: (e: Event) => {
            e.stopPropagation();
            renderItemForm(container, "edit", item, type, refresh);
          },
        },
      })
    );
  }

  // CARD ASSEMBLY
  const cardChildren = [
    imageSection,
    createElement("div", { class: "card-details" }, [
      createElement("div", { class: "card-header-meta" }, [
        createElement("h3", { class: "item-title" }, [item.name || "Unnamed Product"]),
        item.category ? createElement("span", { class: "category-tag" }, [item.category]) : null
      ].filter(Boolean) as HTMLElement[]),
      createElement("p", { class: "item-description" }, [item.description || "No description provided."]),
      pricingSection
    ]),
    actionWrapper
  ];

  const card = createElement("div", { class: `${type}-card items-card-wrapper` }, cardChildren);

  card.addEventListener("click", () => {
    navigate(`/products/${type}/${item.productid}`);
  });

  return card;
}