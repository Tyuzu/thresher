import {
    apiFetch
} from "../../api/api.ts";
import Notify from "../../components/ui/Notify.ts";
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
 *
 * The backend should ideally return something like:
 *
 * {
 *   error: {
 *     code: "OUT_OF_STOCK",
 *     message: "Item is out of stock",
 *     details: {}
 *   }
 * }
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
/**
 * Convert an arbitrary value into a trimmed string.
 *
 * Item IDs are intentionally NOT lower-cased because identifiers
 * can be case-sensitive.
 */
function normalizeItemId(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}
/**
 * Safely parse a cart quantity.
 *
 * Cart quantities should generally be positive integers.
 */
function parseQuantity(value) {
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
 *
 * These values are no longer sent as authoritative cart data.
 * This helper only exists if your UI happens to need them locally.
 */
function normalizeDisplayValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim().slice(0, CART_CONFIG.MAX_NAME_LENGTH);
}
/**
 * Generate a unique idempotency key.
 *
 * crypto.randomUUID() is preferred because it is designed for
 * generating unique request identifiers.
 *
 * The fallback exists for older environments.
 */
function createIdempotencyKey() {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).slice(2);
    return `${timestamp}-${randomPart}`;
}
/**
 * Extract an API error code from a variety of common response shapes.
 *
 * Supports things such as:
 *   err.code
 *   err.error.code
 *   err.response.data.error.code
 */
function getErrorCode(error) {
    return (error?.code || error?.error?.code || error?.response?.data?.error?.code || "");
}
/**
 * Extract a safe human-readable API message.
 *
 * We intentionally prefer known client-side messages for important
 * error codes instead of displaying arbitrary backend text.
 */
function getUserErrorMessage(error) {
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
 *
 * This protects UX and prevents obviously bad requests.
 * The backend MUST perform the same validation independently.
 */
function validateCartInput({
    itemId,
    quantity
}) {
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
function notify(message, type = "warning") {
    Notify(message, {
        type,
        duration: CART_CONFIG.NOTIFY_DURATION
    });
}
/**
 * Dispatch a normalized cart mutation event.
 *
 * Components elsewhere in the application can subscribe to:
 *
 * window.addEventListener("cart:mutated", handler)
 *
 * The event contains only client-relevant information.
 */
function dispatchCartMutation({
    action,
    itemId,
    quantity,
    response
}) {
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
 *
 * IMPORTANT SECURITY MODEL:
 * -------------------------
 * The browser is NOT trusted.
 *
 * The backend must determine:
 *   - authenticated user
 *   - item existence
 *   - item type
 *   - category
 *   - item name
 *   - current price
 *   - availability
 *   - inventory
 *   - cart ownership
 *   - quantity limits
 *
 * The client sends only:
 *   - itemId
 *   - quantity
 *   - idempotencyKey
 *
 * @param {Object} options
 * @param {string|number} options.itemId
 * @param {string|number} [options.quantity=1]
 * @param {boolean} [options.isLoggedIn]
 *   Optional UX hint only. Never treat this as security.
 * @param {Function} [options.onCartUpdated]
 *   Optional callback invoked after the server confirms the mutation.
 *
 * @returns {Promise<boolean>}
 */
export async function addToCart(options = {}) {
    const {
        itemId,
        quantity = 1,
        isLoggedIn,
        onCartUpdated
    } = options;
    /**
     * Optional client-side authentication shortcut.
     *
     * This can avoid an unnecessary network request when your application
     * already knows the user is logged out.
     *
     * The server remains the actual authority.
     */
    if (CART_CONFIG.USE_LOGIN_HINT && isLoggedIn === false) {
        notify("Please log in to add items to your cart", "warning");
        return false;
    }
    /**
     * Normalize only what the client actually needs.
     */
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
    /**
     * Generate this exactly once for this logical mutation.
     *
     * If apiFetch retries the request internally, it should preserve
     * this same key rather than generating a new one.
     */
    const idempotencyKey = createIdempotencyKey();
    /**
     * IMPORTANT:
     * Do NOT send itemName, entityName, entityType, category, price,
     * etc. as trusted cart data.
     *
     * The backend should resolve those from itemId.
     */
    const payload = {
        itemId: cleanItemId,
        quantity: cleanQuantity,
        /**
         * This field allows the backend to make the mutation idempotent.
         *
         * A stronger implementation would send this as an HTTP
         * `Idempotency-Key` header through apiFetch.
         *
         * Keeping it in the body here preserves compatibility with
         * your current apiFetch(url, method, payload) interface.
         */
        idempotencyKey
    };
    try {
        const response = await apiFetch("/cart", "POST", payload);
        /**
         * Only update local state after the backend accepts the mutation.
         */
        if (typeof onCartUpdated === "function") {
            try {
                onCartUpdated(response);
            } catch (callbackError) {
                /**
                 * A broken UI callback should not make a successful cart
                 * mutation look like a failed mutation.
                 */
                console.error("Cart update callback failed:", callbackError);
            }
        }
        /**
         * Broadcast the authoritative server response.
         */
        dispatchCartMutation({
            action: "add",
            itemId: cleanItemId,
            quantity: cleanQuantity,
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
        /**
         * Avoid exposing arbitrary server internals.
         */
        const message = getUserErrorMessage(error);
        notify(message, "error");
        /**
         * Authentication failure can be handled centrally if desired.
         *
         * This event gives your application one place to react without
         * coupling the cart module directly to navigation/auth modules.
         */
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
 *
 * Useful when you want to validate quantity before calling addToCart.
 */
export function isValidCartQuantity(value) {
    return parseQuantity(value) !== null;
}
/**
 * Optional utility for determining whether an item ID is usable.
 */
export function isValidCartItemId(value) {
    const itemId = normalizeItemId(value);
    return (itemId.length > 0 && itemId.length <= CART_CONFIG.MAX_ITEM_ID_LENGTH);
}
/**
 * Optional utility for sanitizing a locally displayed item name.
 *
 * IMPORTANT:
 * This is for UI display only.
 * It should NOT be used as authoritative catalog/cart data.
 */
export function normalizeCartDisplayName(value) {
    return normalizeDisplayValue(value);
}