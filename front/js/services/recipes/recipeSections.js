import {
  createElement
} from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import {
  addToCart,
  isValidCartQuantity,
} from "../cart/addToCart.js";
import {
  getState
} from "../../state/state.js";
import {
  createCommentsSection
} from "../comments/comments.js";
import {
  editRecipe
} from "./createOrEditRecipe.js";
import {
  makeInlineEditable,
  getStepKey,
} from "./recipeRenderers.js";
import Notify from "../../components/ui/Notify.mjs";
const MAX_CART_QUANTITY = 99;
/* ============================================================
   HELPERS
============================================================ */
/**
 * Safely resolve the current user's ID.
 *
 * Depending on the state implementation, `user` may be:
 * - a primitive ID
 * - an object containing `id`
 * - an object containing `userid`
 *
 * Supporting all three here avoids sprinkling state-shape
 * assumptions throughout the renderer.
 */
function getCurrentUserId() {
  const user = getState("user");
  if (!user) {
    return null;
  }
  if (typeof user === "string" || typeof user === "number") {
    return String(user);
  }
  return (user.id ?? user.userid ?? user.userid ?? null);
}
/**
 * Check whether the current user owns the recipe.
 */
function isRecipeOwner(recipe) {
  if (!recipe) {
    return false;
  }
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return false;
  }
  const recipeUserId = recipe.userid ?? recipe.userid ?? recipe.user_id;
  if (recipeUserId === null || recipeUserId === undefined) {
    return false;
  }
  return (String(currentUserId) === String(recipeUserId));
}
/**
 * Convert ingredient quantity into a safe cart quantity.
 *
 * Ingredient quantities in recipes may be fractional
 * because recipes can contain values such as 0.5 kg,
 * but the cart API should only receive a valid quantity
 * according to its own contract.
 *
 * If your backend supports fractional cart quantities,
 * this helper should be adjusted to match that contract.
 */
function normalizeCartQuantity(value) {
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
 *
 * Different recipe payloads sometimes use different naming
 * conventions. Prefer the canonical itemId.
 */
function getIngredientItemId(ingredient) {
  if (!ingredient) {
    return null;
  }
  return (ingredient.itemId ?? ingredient.itemid ?? ingredient.productid ?? ingredient.productId ?? null);
}
/* ============================================================
   INGREDIENTS
============================================================ */
export function renderIngredients(ingredients, isLoggedIn, recipe) {
  const ingList = createElement("ul", {
    class: "ingredients-list",
  });
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return createElement("ul", {
      class: "ingredients-list",
    },
      [
        createElement("li", {},
          ["No ingredients available."]),
      ]);
  }
  const canEditRecipe = isRecipeOwner(recipe);
  /**
   * Create a cart button for a store-backed ingredient.
   */
  function makeAddBtn(ingredient, recipeQuantity) {
    const btn = Button("Add to Cart", "", {}, "small-button");
    let adding = false;
    btn.addEventListener("click", async (event) => {
      event?.stopPropagation?.();
      if (adding) {
        return;
      }
      const token = getState("token");
      if (!token) {
        /**
         * Let addToCart handle the authentication
         * notification consistently.
         */
        await addToCart({
          itemId: getIngredientItemId(ingredient),
          quantity: normalizeCartQuantity(recipeQuantity),
          isLoggedIn: false,
        });
        return;
      }
      const itemId = getIngredientItemId(ingredient);
      if (!itemId) {
        Notify("This ingredient is currently unavailable in the store.", {
          type: "warning",
          duration: 3000,
        });
        return;
      }
      const quantity = normalizeCartQuantity(recipeQuantity);
      if (!Number.isInteger(quantity) || quantity < 1 || !isValidCartQuantity(quantity)) {
        Notify("Invalid ingredient quantity.", {
          type: "warning",
          duration: 3000,
        });
        return;
      }
      adding = true;
      btn.disabled = true;
      try {
        /**
         * IMPORTANT:
         *
         * Only the canonical catalog item ID and
         * requested quantity are sent.
         *
         * Do not send:
         * - itemType
         * - itemName
         * - entityType
         * - entityId
         * - entityName
         *
         * The backend should resolve those values
         * from itemId.
         */
        await addToCart({
          itemId,
          quantity,
          isLoggedIn: true,
          onCartUpdated: (response) => {
            console.debug("Recipe ingredient cart updated:", response);
          },
        });
      } catch (error) {
        /**
         * addToCart normally handles its own
         * errors. Keep this boundary defensive.
         */
        console.error("Failed to add recipe ingredient to cart:", error);
      } finally {
        adding = false;
        btn.disabled = false;
      }
    });
    return btn;
  }
  ingredients.forEach(
    (ingredient, index) => {
      const li = createElement("li", {});
      const quantity = ingredient.quantity ?? "";
      const unit = ingredient.unit ?? "";
      const name = ingredient.name ?? "";
      const textContainer = createElement("span", {},
        [`${quantity} ${unit} ${name}`.trim(),]);
      li.appendChild(textContainer);
      // --------------------------------------------------------
      // Store availability
      // --------------------------------------------------------
      const itemId = getIngredientItemId(ingredient);
      if (!itemId) {
        li.appendChild(createElement("span", {
          class: "warning",
        },
          ["Unavailable in store",]));
      }
      // --------------------------------------------------------
      // Add to cart
      // --------------------------------------------------------
      if (isLoggedIn && itemId) {
        li.appendChild(makeAddBtn(ingredient, quantity));
      }
      // --------------------------------------------------------
      // Author controls
      // --------------------------------------------------------
      if (canEditRecipe) {
        const editBtn = Button("Edit", "", {}, "tiny-button");
        const delBtn = Button("Delete", "", {}, "tiny-button");
        editBtn.addEventListener("click",
          (event) => {
            event?.stopPropagation?.();
            makeInlineEditable(textContainer, name,
              (newValue) => {
                const cleanValue = String(newValue ?? "").trim();
                ingredient.name = cleanValue;
                textContainer.replaceChildren(`${ingredient.quantity ?? ""} ${ingredient.unit ?? ""
                  } ${cleanValue}`.trim());
              });
          });
        delBtn.addEventListener("click",
          (event) => {
            event?.stopPropagation?.();
            if (!confirm("Delete this ingredient?")) {
              return;
            }
            li.remove();
            /**
             * Mutate the backing array so any existing
             * save/update operation sees the deletion.
             */
            ingredients.splice(index, 1);
          });
        li.append(editBtn, delBtn);
      }
      ingList.appendChild(li);
    });
  return ingList;
}
/* ============================================================
   STEPS
============================================================ */
export function renderSteps(recipeid, steps, recipe) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  let completedSteps = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(getStepKey(recipeid)) || "[]");
    if (Array.isArray(stored)) {
      completedSteps = new Set(stored.filter(
        (value) => Number.isInteger(value) && value >= 0));
    }
  } catch (error) {
    console.warn("Failed to restore recipe progress:", error);
  }
  const progressFill = createElement("div", {
    class: "progress-fill",
  });
  const progressText = createElement("span", {
    class: "progress-text",
  });

  function updateProgress() {
    const percentage = safeSteps.length ? Math.round(
      (completedSteps.size / safeSteps.length) * 100) : 0;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% done`;
  }
  updateProgress();
  const stepsOl = createElement("ol", {});
  const canEditRecipe = isRecipeOwner(recipe);
  safeSteps.forEach(
    (step, index) => {
      const text = typeof step === "object" ? step?.text ?? "" : String(step ?? "");
      const li = createElement("li", {});
      const checkbox = createElement("input", {
        type: "checkbox",
        "aria-label": `Complete step ${index + 1}`,
      });
      checkbox.checked = completedSteps.has(index);
      checkbox.addEventListener("change",
        (event) => {
          if (event.target.checked) {
            completedSteps.add(index);
          } else {
            completedSteps.delete(index);
          }
          try {
            localStorage.setItem(getStepKey(recipeid), JSON.stringify(
              [...completedSteps]));
          } catch (error) {
            console.warn("Failed to save recipe progress:", error);
          }
          updateProgress();
        });
      const textContainer = createElement("span", {},
        [text]);
      li.append(checkbox, textContainer);
      // --------------------------------------------------------
      // Author controls
      // --------------------------------------------------------
      if (canEditRecipe) {
        const editBtn = Button("Edit", "", {}, "tiny-button");
        const delBtn = Button("Delete", "", {}, "tiny-button");
        editBtn.addEventListener("click",
          (event) => {
            event?.stopPropagation?.();
            makeInlineEditable(textContainer, text,
              (newValue) => {
                const cleanValue = String(newValue ?? "").trim();
                /**
                 * Preserve any additional properties
                 * on object-based steps.
                 */
                if (typeof step === "object") {
                  safeSteps[index] = {
                    ...step,
                    text: cleanValue,
                  };
                } else {
                  safeSteps[index] = {
                    text: cleanValue,
                  };
                }
                textContainer.replaceChildren(cleanValue);
              });
          });
        delBtn.addEventListener("click",
          (event) => {
            event?.stopPropagation?.();
            if (!confirm("Delete this step?")) {
              return;
            }
            li.remove();
            safeSteps.splice(index, 1);
            /**
             * Step indexes changed after deletion.
             * Rebuild the completed set so progress doesn't
             * accidentally point at the wrong step.
             */
            completedSteps = new Set(
              [...completedSteps].filter(
                (completedIndex) => completedIndex !== index).map(
                  (completedIndex) => completedIndex > index ? completedIndex - 1 : completedIndex));
            try {
              localStorage.setItem(getStepKey(recipeid), JSON.stringify(
                [...completedSteps]));
            } catch (error) {
              console.warn("Failed to save recipe progress:", error);
            }
            updateProgress();
          });
        li.append(editBtn, delBtn);
      }
      stepsOl.appendChild(li);
    });
  const progressBar = createElement("div", {
    class: "progress-bar",
    role: "progressbar",
    "aria-valuemin": "0",
    "aria-valuemax": "100",
  },
    [
      progressFill,
      progressText,
    ]);
  return createElement("div", {
    class: "steps-section",
  },
    [
      progressBar,
      stepsOl,
    ]);
}
/* ============================================================
   COMMENTS
============================================================ */
export function renderComments(recipe) {
  const wrapper = createElement("div", {
    class: "recipe-comments",
  });
  const heading = createElement("h4", {},
    ["Comments"]);
  const toggle = createElement("button", {
    type: "button",
    class: "toggle-comments btn btn-link",
    "aria-expanded": "false",
  },
    ["💬 Show Comments"]);
  let commentsEl = null;
  let visible = false;
  let loaded = false;
  let loading = false;
  toggle.addEventListener("click", async () => {
    /**
     * If already loaded, simply toggle visibility.
     * No unnecessary network request.
     */
    if (loaded) {
      visible = !visible;
      if (commentsEl) {
        commentsEl.style.display = visible ? "" : "none";
      }
      toggle.textContent = visible ? "💬 Hide Comments" : "💬 Show Comments";
      toggle.setAttribute("aria-expanded", String(visible));
      return;
    }
    if (loading) {
      return;
    }
    loading = true;
    toggle.disabled = true;
    try {
      commentsEl = await createCommentsSection("recipe", recipe.recipeid, getState("user").userid);
      if (!commentsEl) {
        throw new Error("Comments component returned no element.");
      }
      wrapper.appendChild(commentsEl);
      loaded = true;
      visible = true;
      toggle.textContent = "💬 Hide Comments";
      toggle.setAttribute("aria-expanded", "true");
    } catch (error) {
      console.error("Failed to load comments:", error);
      Notify("Failed to load comments.", {
        type: "error",
        duration: 3000,
        dismissible: true,
      });
    } finally {
      loading = false;
      toggle.disabled = false;
    }
  });
  wrapper.append(heading, toggle);
  return wrapper;
}
/* ============================================================
   ACTIONS
============================================================ */
export function renderActions(recipe, currentUser, contentContainer, isFavorite, recipeid) {
  // ----------------------------------------------------------
  // Favorite
  // ----------------------------------------------------------
  const favBtn = Button(isFavorite ? "Unsave" : "Save Recipe", "", {}, "buttonx secondary");
  favBtn.addEventListener("click",
    () => {
      let favorites = [];
      try {
        const stored = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
        if (Array.isArray(stored)) {
          favorites = stored;
        }
      } catch (error) {
        console.warn("Failed to read favorite recipes:", error);
      }
      const normalizedRecipeId = String(recipeid);
      const normalizedFavorites = favorites.map(
        (id) => String(id));
      if (isFavorite) {
        favorites = normalizedFavorites.filter(
          (id) => id !== normalizedRecipeId);
        isFavorite = false;
      } else {
        favorites = [...new Set([...normalizedFavorites,
          normalizedRecipeId,
        ]),];
        isFavorite = true;
      }
      try {
        localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
      } catch (error) {
        console.warn("Failed to save favorite recipe:", error);
        Notify("Unable to save this recipe locally.", {
          type: "warning",
          duration: 3000,
        });
        return;
      }
      favBtn.textContent = isFavorite ? "Unsave" : "Save Recipe";
    });
  // ----------------------------------------------------------
  // Share
  // ----------------------------------------------------------
  const shareBtn = Button("Copy Link", "", {}, "buttonx secondary");
  shareBtn.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable.");
      }
      await navigator.clipboard.writeText(window.location.href);
      Notify("Recipe link copied.", {
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to copy recipe link:", error);
      Notify("Unable to copy the recipe link.", {
        type: "warning",
        duration: 3000,
      });
    }
  });
  // ----------------------------------------------------------
  // Print
  // ----------------------------------------------------------
  const printBtn = Button("Print", "", {}, "buttonx secondary");
  printBtn.addEventListener("click",
    () => {
      window.print();
    });
  const actions = [
    favBtn,
    shareBtn,
    printBtn,
  ];
  // ----------------------------------------------------------
  // Author edit
  // ----------------------------------------------------------
  const resolvedCurrentUserId = currentUser?.id ?? currentUser?.userid ?? currentUser?.userid ?? currentUser;
  const resolvedRecipeUserId = recipe?.userid ?? recipe?.userid ?? recipe?.user_id;
  const isOwner = resolvedCurrentUserId !== null && resolvedCurrentUserId !== undefined && resolvedRecipeUserId !== null && resolvedRecipeUserId !== undefined && String(resolvedCurrentUserId) === String(resolvedRecipeUserId);
  if (isOwner) {
    const editBtn = Button("Edit", "", {}, "buttonx secondary");
    editBtn.addEventListener("click",
      () => {
        editRecipe(contentContainer, recipe);
      });
    actions.push(editBtn);
  }
  // ----------------------------------------------------------
  // Back
  // ----------------------------------------------------------
  const backBtn = Button("Back", "", {}, "buttonx primary");
  backBtn.addEventListener("click",
    () => {
      history.back();
    });
  actions.push(backBtn);
  return createElement("div", {
    class: "recipe-actions",
  }, actions);
}