// src/ui/cart/cartService.ts
import Notify from "../../components/ui/Notify.js";
import { addCartItem } from "./api.js";

/**
 * Cart configuration.
 *
 * Keep these limits aligned with the backend.
 */
const CART_CONFIG = Object.freeze({
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 99,
  MAX_ITEM_ID_LENGTH: 200,
  MAX_NAME_LENGTH: 200,
  NOTIFY_DURATION: 3000,
  /**
   * When enabled, the frontend treats an explicitly supplied
   * `isLoggedIn: false` as a UX shortcut and avoids making a request.
   *
   * IMPORTANT:
   * This is NOT a security mechanism.
   * The backend must still authenticate every cart request.
   */
  USE_LOGIN_HINT: true
});

/**
 * Error codes expected from the API.
 */
const ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_ITEM: "INVALID_ITEM",
  ITEM_UNAVAILABLE: "ITEM_UNAVAILABLE",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  QUANTITY_LIMIT: "QUANTITY_LIMIT",
  CART_LIMIT: "CART_LIMIT",
  RATE_LIMITED: "RATE_LIMITED"
});

export interface AddToCartOptions {
  itemId?: string | number;
  quantity?: number | string;
  isLoggedIn?: boolean;
  onCartUpdated?: (response: any) => void;
}

export interface CartMutationDetail {
  action: string;
  itemId: string;
  quantity: number;
  response: any;
}

/**
 * Convert an arbitrary value into a trimmed string.
 */
function normalizeItemId(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

/**
 * Safely parse a cart quantity.
 */
function parseQuantity(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return null;
  }
  const quantity = Number(value);
  if (!Number.isInteger(quantity)) {
    return null;
  }
  if (quantity < CART_CONFIG.MIN_QUANTITY || quantity > CART_CONFIG.MAX_QUANTITY) {
    return null;
  }
  return quantity;
}

/**
 * Optional display string normalization.
 */
function normalizeDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().slice(0, CART_CONFIG.MAX_NAME_LENGTH);
}

/**
 * Generate a unique idempotency key.
 */
function createIdempotencyKey(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2);
  return `${timestamp}-${randomPart}`;
}

/**
 * Extract an API error code from a variety of common response shapes.
 */
function getErrorCode(error: any): string {
  return (error?.code || error?.error?.code || error?.response?.data?.error?.code || "");
}

/**
 * Extract a safe human-readable API message.
 */
function getUserErrorMessage(error: any): string {
  const code = getErrorCode(error);
  switch (code) {
    case ERROR_CODES.AUTH_REQUIRED:
      return "Please log in to add items to your cart.";
    case ERROR_CODES.INVALID_ITEM:
      return "This item is not valid.";
    case ERROR_CODES.ITEM_UNAVAILABLE:
      return "This item is no longer available.";
    case ERROR_CODES.OUT_OF_STOCK:
      return "This item is out of stock.";
    case ERROR_CODES.QUANTITY_LIMIT:
      return "The requested quantity is not available.";
    case ERROR_CODES.CART_LIMIT:
      return "Your cart has reached its item limit.";
    case ERROR_CODES.RATE_LIMITED:
      return "Too many cart requests. Please try again shortly.";
    default:
      return "Failed to add item to cart.";
  }
}

/**
 * Validate the normalized request before sending it.
 */
function validateCartInput({ itemId, quantity }: { itemId: string; quantity: number | null }): string | null {
  if (!itemId) {
    return "Invalid item ID";
  }
  if (itemId.length > CART_CONFIG.MAX_ITEM_ID_LENGTH) {
    return "Invalid item ID";
  }
  if (!quantity) {
    return "Invalid quantity";
  }
  if (quantity < CART_CONFIG.MIN_QUANTITY) {
    return "Invalid quantity";
  }
  if (quantity > CART_CONFIG.MAX_QUANTITY) {
    return `Maximum quantity is ${CART_CONFIG.MAX_QUANTITY}`;
  }
  return null;
}

/**
 * Notify the user consistently.
 */
function notify(message: string, type: "success" | "warning" | "error" = "warning"): void {
  Notify(message, {
    type,
    duration: CART_CONFIG.NOTIFY_DURATION
  });
}

/**
 * Dispatch a normalized cart mutation event.
 */
function dispatchCartMutation({ action, itemId, quantity, response }: CartMutationDetail): void {
  window.dispatchEvent(new CustomEvent("cart:mutated", {
    detail: {
      action,
      itemId,
      quantity,
      response
    }
  }));
}

/**
 * Add an item to the authenticated user's cart.
 */
export async function addToCart(options: AddToCartOptions = {}): Promise<boolean> {
  const {
    itemId,
    quantity = 1,
    isLoggedIn,
    onCartUpdated
  } = options;

  if (CART_CONFIG.USE_LOGIN_HINT && isLoggedIn === false) {
    notify("Please log in to add items to your cart", "warning");
    return false;
  }

  const cleanItemId = normalizeItemId(itemId);
  const cleanQuantity = parseQuantity(quantity);
  const validationError = validateCartInput({
    itemId: cleanItemId,
    quantity: cleanQuantity
  });

  if (validationError) {
    notify(validationError, "warning");
    return false;
  }

  const idempotencyKey = createIdempotencyKey();

  const payload = {
    itemId: cleanItemId,
    quantity: cleanQuantity,
    idempotencyKey
  };

  try {
    const response = await addCartItem(payload);

    if (typeof onCartUpdated === "function") {
      try {
        onCartUpdated(response);
      } catch (callbackError) {
        console.error("Cart update callback failed:", callbackError);
      }
    }

    dispatchCartMutation({
      action: "add",
      itemId: cleanItemId,
      quantity: cleanQuantity!,
      response
    });
    
    notify("Added to cart successfully", "success");
    return true;
  } catch (error) {
    console.error("Add to cart failed:", {
      error,
      itemId: cleanItemId,
      quantity: cleanQuantity,
      idempotencyKey
    });

    const message = getUserErrorMessage(error);
    notify(message, "error");

    if (getErrorCode(error) === ERROR_CODES.AUTH_REQUIRED) {
      window.dispatchEvent(new CustomEvent("auth:required", {
        detail: {
          reason: "cart_add"
        }
      }));
    }
    return false;
  }
}

/**
 * Optional utility for UI components.
 */
export function isValidCartQuantity(value: unknown): boolean {
  return parseQuantity(value) !== null;
}

/**
 * Optional utility for determining whether an item ID is usable.
 */
export function isValidCartItemId(value: unknown): boolean {
  const itemId = normalizeItemId(value);
  return (itemId.length > 0 && itemId.length <= CART_CONFIG.MAX_ITEM_ID_LENGTH);
}

/**
 * Optional utility for sanitizing a locally displayed item name.
 */
export function normalizeCartDisplayName(value: unknown): string {
  return normalizeDisplayValue(value);
}

export default addToCart;