import {
  createElement
} from "../../components/createElement.ts";
import Button from "../../components/base/Button.ts";
import {
  addToCart,
  isValidCartQuantity,
} from "../cart/addToCart.ts";
import {
  getState
} from "../../state/state.ts";
import {
  renderItemForm
} from "../crops/products/createOrEdit.ts";
const MAX_CART_QUANTITY = 99;
/**
 * Normalize product stock for UI purposes.
 *
 * The backend remains authoritative and must validate
 * current inventory when the cart mutation is received.
 */
function normalizeStock(value) {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock <= 0) {
    return 0;
  }
  return Math.floor(stock);
}
/**
 * Clamp a quantity to the valid frontend range.
 */
function clampQuantity(value, maxStock) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }
  return Math.min(Math.max(Math.floor(numericValue), 1), Math.min(maxStock, MAX_CART_QUANTITY));
}
export function renderProductActions(product, productType, productId, container, refresh) {
  // ------------------------------------------------------------
  // Validate product identity
  // ------------------------------------------------------------
  const resolvedProductId = product?.productid || productId;
  if (!resolvedProductId) {
    console.warn("renderProductActions: Missing product ID", product, productId);
    return createElement("div", {
      class: "product-actions",
    },
      [
        createElement("p", {
          class: "error-text",
        },
          ["Invalid product data"]),
      ]);
  }
  // ------------------------------------------------------------
  // Stock
  // ------------------------------------------------------------
  const stock = normalizeStock(product?.quantity ?? product?.stock ?? product?.stockQuantity);
  const hasStock = stock > 0;
  /**
   * If stock is unavailable in the product payload,
   * allow the UI to function rather than incorrectly
   * displaying "Out of Stock".
   *
   * The backend remains authoritative.
   */
  const hasKnownStock = product?.quantity !== undefined || product?.stock !== undefined || product?.stockQuantity !== undefined;
  const maxQuantity = hasKnownStock ? Math.min(stock, MAX_CART_QUANTITY) : MAX_CART_QUANTITY;
  // ------------------------------------------------------------
  // Quantity state
  // ------------------------------------------------------------
  let quantity = 1;
  const quantityValue = createElement("span", {
    class: "quantity-value",
    "aria-live": "polite",
  },
    [String(quantity)]);
  const updateQuantityDisplay = () => {
    quantityValue.replaceChildren(String(quantity));
  };
  const setQuantity = (nextQuantity) => {
    quantity = clampQuantity(nextQuantity, maxQuantity);
    updateQuantityDisplay();
  };
  // ------------------------------------------------------------
  // Decrement
  // ------------------------------------------------------------
  const decrementBtn = Button("−", "", {
    click: (event) => {
      event?.stopPropagation?.();
      if (quantity > 1) {
        setQuantity(quantity - 1);
      }
    },
  }, "quantity-btn");
  // ------------------------------------------------------------
  // Increment
  // ------------------------------------------------------------
  const incrementBtn = Button("+", "", {
    click: (event) => {
      event?.stopPropagation?.();
      if (quantity < maxQuantity) {
        setQuantity(quantity + 1);
      }
    },
  }, "quantity-btn");
  // ------------------------------------------------------------
  // Quantity control
  // ------------------------------------------------------------
  const quantityControl = createElement("div", {
    class: "quantity-control",
    id: `qty-${resolvedProductId}`,
    role: "group",
    "aria-label": "Product quantity",
  },
    [
      decrementBtn,
      quantityValue,
      incrementBtn,
    ]);
  // ------------------------------------------------------------
  // Add to Cart
  // ------------------------------------------------------------
  let addingToCart = false;
  const handleAdd = async (event) => {
    event?.stopPropagation?.();
    if (addingToCart) {
      return;
    }
    const token = getState("token");
    if (!token) {
      // addToCart also handles authentication,
      // but this prevents unnecessary UI work.
      await addToCart({
        itemId: resolvedProductId,
        quantity,
        isLoggedIn: false,
      });
      return;
    }
    if (hasKnownStock && !hasStock) {
      return;
    }
    /**
     * Make absolutely sure the quantity being sent is
     * an integer and within the frontend cart limit.
     */
    const safeQuantity = clampQuantity(quantity, maxQuantity);
    if (!Number.isInteger(safeQuantity) || safeQuantity < 1 || !isValidCartQuantity(safeQuantity)) {
      console.warn("renderProductActions: Invalid cart quantity", {
        quantity,
        maxQuantity,
        productId: resolvedProductId,
      });
      return;
    }
    addingToCart = true;
    addToCartBtn.disabled = true;
    try {
      /**
       * IMPORTANT:
       *
       * The cart API now receives only the canonical
       * product ID and quantity.
       *
       * Do NOT send:
       *
       *   itemType
       *   itemName
       *   entityType
       *   entityId
       *   entityName
       *
       * Those values can be stale or manipulated in the
       * browser. The backend should resolve authoritative
       * product information itself.
       */
      await addToCart({
        itemId: resolvedProductId,
        quantity: safeQuantity,
        isLoggedIn: true,
        onCartUpdated: (response) => {
          console.debug("Product cart updated:", response);
        },
      });
    } catch (error) {
      /**
       * addToCart() normally handles its own errors.
       * This is a defensive boundary in case its
       * implementation changes later.
       */
      console.error("Failed to add product to cart:", error);
    } finally {
      addingToCart = false;
      /**
       * Only re-enable the button if the product
       * is still allowed to be added.
       */
      addToCartBtn.disabled = hasKnownStock ? !hasStock : false;
    }
  };
  const addToCartBtn = Button(hasKnownStock && !hasStock ? "Out of Stock" : "Add to Cart", `add-to-cart-${resolvedProductId}`, {
    click: handleAdd,
  }, "primary-button");
  if (hasKnownStock && !hasStock) {
    addToCartBtn.disabled = true;
  }
  // ------------------------------------------------------------
  // Quantity section
  // ------------------------------------------------------------
  const children = [
    createElement("div", {
      class: "quantity-section",
    },
      [
        createElement("label", {},
          ["Quantity:"]),
        quantityControl,
      ]),
    addToCartBtn,
  ];
  // ------------------------------------------------------------
  // Creator permissions
  // ------------------------------------------------------------
  const currentUserId = getState("user").userid;
  const isCreator = Boolean(getState("token")) && currentUserId && product.userid === currentUserId;
  if (isCreator) {
    children.push(Button("Edit", `edit-${productType}-${resolvedProductId}`, {
      click: (event) => {
        event?.stopPropagation?.();
        renderItemForm(container, "edit", product, productType, refresh);
      },
    }, "buttonx"));
  }
  // ------------------------------------------------------------
  // Final component
  // ------------------------------------------------------------
  return createElement("div", {
    class: "product-actions",
  }, children);
}