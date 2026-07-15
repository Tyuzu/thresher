import Button from "../../../components/base/Button";
import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement";
import { navigate } from "../../../routes";
import {
  resolveImagePath,
  EntityType,
  PictureType,
} from "../../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import { addToCart } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";
import { renderItemForm } from "./createOrEdit.js";

export function renderItemCard(
  item,
  type,
  isLoggedIn,
  container,
  refresh
) {
  let quantity = 1;
  const maxStock = typeof item.quantity === "number" ? item.quantity : 999;

  const quantityDisplay = createElement(
    "span",
    { class: "quantity-value" },
    [String(quantity)]
  );

  const decrementBtn = Button("−", "", {
    click: (e) => {
      e.stopPropagation();
      if (quantity > 1) {
        quantity--;
        quantityDisplay.textContent = String(quantity);
      }
    },
  }, "quantity-btn btn-minus");

  const incrementBtn = Button("+", "", {
    click: (e) => {
      e.stopPropagation();
      if (quantity < maxStock) {
        quantity++;
        quantityDisplay.textContent = String(quantity);
      }
    },
  }, "quantity-btn btn-plus");

  const quantityControl = createElement(
    "div",
    { class: "quantity-control" },
    [decrementBtn, quantityDisplay, incrementBtn]
  );

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (maxStock <= 0) return;

    await addToCart({
      itemId: item.productid,
      quantity,
      isLoggedIn: Boolean(getState("token")),
      itemType: type,
      itemName: item.name,
      entityType: "product",
      entityId: item.productid,
      entityName: item.name,
    });
  };

  const currentUserId = getState("user");
  const isCreator = isLoggedIn && currentUserId && item.userid === currentUserId;

  // --- IMAGE SECTION ---
  const imageSection = createElement("div", { class: "image-section" });
  // Map banner file path fallback to potential array paths within item.images
  const targetImage = item.banner || (Array.isArray(item.images) ? item.images[0] : item.images);

  const image = Imagex({
    src: resolveImagePath(
      EntityType.PRODUCT,
      PictureType.THUMB,
      targetImage
    ),
    alt: item.name || "Product",
    id: `product-image-${item.productid}`,
  });

  image.addEventListener("click", (e) => e.stopPropagation());
  imageSection.appendChild(image);

  if (isCreator) {
    imageSection.append(
      Button(
        "Edit Image",
        `edit-image-${item.productid}`,
        {
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
        },
        "edit-banner-pic overlay-edit-btn"
      )
    );
  }

  // --- CALCULATE PRICING ---
  const hasDiscount = Number(item.discount || 0) > 0;
  const discountedPrice = hasDiscount ? item.price * (1 - Number(item.discount || 0) / 100) : item.price;
  const displayUnit = item.unit ? ` / ${item.unit}` : "";

  const pricingSection = createElement("div", { class: "card-pricing" }, [
    hasDiscount
      ? createElement("div", { class: "price-row" }, [
        createElement("span", { class: "current-price discounted" }, [`₹${discountedPrice.toFixed(2)}${displayUnit}`]),
        createElement("span", { class: "original-price strike" }, [`₹${item.price.toFixed(2)}`]),
        createElement("span", { class: "discount-badge" }, [`${item.discount}% OFF`])
      ])
      : createElement("span", { class: "current-price" }, [`₹${item.price.toFixed(2)}${displayUnit}`])
  ]);

  // --- ACTIONS SECTION ---
  const actionWrapper = createElement("div", { class: "card-actions" });

  if (maxStock > 0) {
    actionWrapper.append(
      createElement("div", { class: "quantity-row" }, [
        createElement("label", { class: "quantity-label" }, ["Qty:"]),
        quantityControl
      ]),
      Button(
        "Add to Cart",
        `add-to-cart-${item.productid}`,
        { click: handleAdd },
        "buttonx primary-action-btn"
      )
    );
  } else {
    actionWrapper.append(
      createElement("div", { class: "out-of-stock-badge" }, ["Out of Stock"])
    );
  }

  if (isCreator) {
    actionWrapper.append(
      Button(
        "Edit Details",
        `edit-${type}-${item.productid}`,
        {
          click: (e) => {
            e.stopPropagation();
            renderItemForm(container, "edit", item, type, refresh);
          },
        },
        "buttonx secondary-action-btn edit-item-btn"
      )
    );
  }

  // --- ASSEMBLE CARD ---
  const cardChildren = [
    imageSection,
    createElement("div", { class: "card-details" }, [
      createElement("div", { class: "card-header-meta" }, [
        createElement("h3", { class: "item-title" }, [item.name]),
        item.category ? createElement("span", { class: "category-tag" }, [item.category]) : null
      ].filter(Boolean)),
      createElement("p", { class: "item-description" }, [item.description || "No description provided."]),
      pricingSection
    ]),
    actionWrapper
  ];

  const card = createElement(
    "div",
    { class: `${type}-card items-card-wrapper` },
    cardChildren
  );

  card.addEventListener("click", () => {
    navigate(`/products/${type}/${item.productid}`);
  });

  return card;
}