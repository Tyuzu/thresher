import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { fetchProductById, type ProductDetail } from "./api.js";
import Imagex from "../../components/base/Imagex.js";
import Notify from "../../components/ui/Notify.js";
import { addToCart, isValidCartQuantity } from "../cart/addToCart.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";

function normalizeProductImage(item: ProductDetail): string {
  const raw = item.banner || item.photo || item.images;
  if (Array.isArray(raw)) {
    return raw[0] || "";
  }
  return typeof raw === "string" ? raw : "";
}

function formatPrice(value: number | string | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function displayProduct(
  isLoggedIn: boolean,
  productType: string,
  productId: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.replaceChildren();

  const safeType = (productType || "product").trim() || "product";
  const safeId = (productId || "").trim();

  if (!safeId) {
    contentContainer.textContent = "Product not found.";
    return;
  }

  const wrapper = createElement("div", { class: "product-page" });
  contentContainer.appendChild(wrapper);

  try {
    const product = await fetchProductById(safeType, safeId);

    if (!product || !product.productid) {
      wrapper.replaceChildren(createElement("p", {}, ["Product not found."]));
      return;
    }

    const imageValue = normalizeProductImage(product);
    const image = Imagex({
      src: resolveImagePath(EntityType.PRODUCT, PictureType.THUMB, imageValue || "product"),
      alt: product.name || "Product image",
    });

    const priceValue = Number(product.price ?? 0);
    const discountValue = Number(product.discount ?? 0);
    const hasDiscount = Number.isFinite(discountValue) && discountValue > 0;
    const effectivePrice = hasDiscount
      ? Math.max(priceValue * (1 - discountValue / 100), 0)
      : priceValue;

    const title = createElement("h1", {}, [product.name || "Product"]);
    const meta = createElement("div", { class: "product-meta" }, [
      product.category ? createElement("span", {}, [product.category]) : null,
      product.unit ? createElement("span", {}, [`Unit: ${product.unit}`]) : null,
      product.quantity !== undefined ? createElement("span", {}, [`Stock: ${product.quantity}`]) : null,
    ].filter(Boolean) as HTMLElement[]);

    const priceBlock = createElement("div", { class: "product-price" }, [
      hasDiscount
        ? createElement("div", {}, [
            createElement("span", { class: "current-price" }, [`₹${formatPrice(effectivePrice)}`]),
            createElement("span", { class: "original-price" }, [`₹${formatPrice(product.price)}`]),
            createElement("span", { class: "discount-badge" }, [`${Math.min(Math.max(discountValue, 0), 100).toFixed(0)}% OFF`]),
          ])
        : createElement("span", { class: "current-price" }, [`₹${formatPrice(product.price)}`]),
    ]);

    const description = createElement("p", { class: "product-description" }, [
      product.description || "No description available.",
    ]);

    const quantityInput = createElement("input", {
      type: "number",
      min: "1",
      max: String(Math.max(Number(product.quantity ?? 1), 1)),
      value: "1",
      step: "1",
      class: "product-qty",
    }) as HTMLInputElement;

    const actions = createElement("div", { class: "product-actions" });

    if (isLoggedIn) {
      const addButton = Button({
        title: "Add to Cart",
        classes: "primary-button",
        events: {
          click: async () => {
            const rawQty = Number(quantityInput.value);
            if (!isValidCartQuantity(rawQty)) {
              Notify("Please enter a valid quantity.", { type: "warning" });
              return;
            }

            const success = await addToCart({
              itemId: product.productid || safeId,
              quantity: rawQty,
              isLoggedIn: true,
            });

            if (success) {
              Notify("Added to cart successfully.", { type: "success" });
            }
          },
        },
      }) as HTMLButtonElement;

      actions.appendChild(addButton);
    } else {
      actions.appendChild(
        createElement("p", {}, ["Please log in to add this item to your cart."])
      );
    }

    wrapper.replaceChildren(
      createElement("div", { class: "product-layout" }, [
        createElement("div", { class: "product-image-block" }, [image]),
        createElement("div", { class: "product-content" }, [
          title,
          meta,
          priceBlock,
          description,
          createElement("div", { class: "qty-row" }, [
            createElement("label", {}, ["Qty:"]),
            quantityInput,
          ]),
          actions,
        ]),
      ])
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load product details.";
    wrapper.replaceChildren(createElement("p", { class: "error-message" }, [message]));
  }
}
