import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

/**
 * Map itemType to backend category
 */
const TYPE_MAP = Object.freeze({
  product: "products",
  book: "products",
  merch: "merchandise",
  merchandise: "merchandise",
  menu: "menu",
  food: "menu",
  crop: "crops",
  farm: "crops",
  service: "services"
});

function normalize(value) {
  return value !== null && value !== undefined ? String(value).trim().toLowerCase() : "";
}

function getCategory(cleanItemType, cleanEntityType) {
  if (TYPE_MAP[cleanItemType]) {
    return TYPE_MAP[cleanItemType];
  }

  if (TYPE_MAP[cleanEntityType]) {
    return TYPE_MAP[cleanEntityType];
  }

  return cleanEntityType || "general";
}

/**
 * Validates fully pre-normalized inputs.
 */
function validateNormalizedInput({
  itemId,
  itemType,
  entityType,
  entityId,
  quantity
}) {
  if (!itemId) return "Invalid item ID";
  if (!itemType) return "Invalid item type";
  if (!entityType) return "Invalid entity type";
  if (!entityId) return "Invalid entity ID";
  
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Invalid quantity";
  }

  return null;
}

/**
 * Add item to cart
 * @param {Object} options - Add configurations.
 * @param {Function} [options.onCartUpdated] - Optional local callback hook to run reactive state adjustments.
 */
export async function addToCart(options = {}) {
  const { isLoggedIn = false, onCartUpdated } = options;

  if (!isLoggedIn) {
    Notify("Please log in to add items to your cart", {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  // FIXED: Pre-normalize all components to avoid validation mismatches and mapping drops
  const cleanFields = {
    itemId: normalize(options.itemId),
    itemType: normalize(options.itemType),
    entityType: normalize(options.entityType),
    entityId: normalize(options.entityId),
    quantity: Number(options.quantity)
  };

  const error = validateNormalizedInput(cleanFields);
  if (error) {
    Notify(error, {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  // Build payload using clean values
  const payload = {
    itemId: cleanFields.itemId,
    itemType: cleanFields.itemType,
    entityType: cleanFields.entityType,
    entityId: cleanFields.entityId,
    quantity: cleanFields.quantity,
    category: getCategory(cleanFields.itemType, cleanFields.entityType)
  };

  if (options.itemName) payload.itemName = String(options.itemName).trim();
  if (options.entityName) payload.entityName = String(options.entityName).trim();

  try {
    const response = await apiFetch("/cart", "POST", payload);

    Notify("Added to cart successfully", {
      type: "success",
      duration: 3000
    });

    // FIXED: Broadcast the state update locally and globally to prevent navigation layout sync blocks
    if (typeof onCartUpdated === "function") {
      onCartUpdated(response);
    }
    
    window.dispatchEvent(new CustomEvent("cart:mutated", { 
      detail: { action: "add", payload } 
    }));

    return true;
  } catch (err) {
    console.error("Add to cart failed:", err);

    Notify(
      err?.message || "Failed to add item to cart",
      {
        type: "error",
        duration: 3000
      }
    );

    return false;
  }
}