import { getState } from "../../state/state.js";
import { Recipe, Ingredient, User } from "./types/recipe.js";

export const MAX_CART_QUANTITY = 99;

/**
 * Safely resolve the current user's ID.
 */
export function getCurrentUserId(): string | null {
  const user = getState("user") as User | string | number | null;
  if (!user) {
    return null;
  }
  if (typeof user === "string" || typeof user === "number") {
    return String(user);
  }
  const id = user.id ?? user.userid ?? null;
  return id !== null ? String(id) : null;
}

/**
 * Check whether the current user owns the recipe.
 */
export function isRecipeOwner(recipe?: Recipe | null): boolean {
  if (!recipe) {
    return false;
  }
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return false;
  }
  const recipeUserId = recipe.userid ?? recipe.user_id;
  if (recipeUserId === null || recipeUserId === undefined) {
    return false;
  }
  return String(currentUserId) === String(recipeUserId);
}

/**
 * Convert ingredient quantity into a safe cart quantity.
 */
export function normalizeCartQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) {
    return 1;
  }
  const normalized = Math.floor(quantity);
  if (normalized < 1) {
    return 1;
  }
  return Math.min(normalized, MAX_CART_QUANTITY);
}

/**
 * Read a catalog item's ID from an ingredient.
 */
export function getIngredientItemId(ingredient?: Ingredient | null): string | number | undefined {
  if (!ingredient) {
    return undefined;
  }
  return (
    ingredient.itemId ?? ingredient.itemid ?? ingredient.productid ?? ingredient.productId ?? undefined
  );
}