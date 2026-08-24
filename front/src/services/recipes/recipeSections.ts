import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { addToCart, isValidCartQuantity } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";
import { createCommentsSection } from "../comments/comments.js";
import { editRecipe } from "./createOrEditRecipe.js";
import { makeInlineEditable, getStepKey } from "./recipeRenderers.js";
import Notify from "../../components/ui/Notify.js";
import {
  isRecipeOwner,
  normalizeCartQuantity,
  getIngredientItemId
} from "./recipeHelpers.js";
import { Recipe, Ingredient, RecipeStep, User } from "./types/recipe.js";

/* ============================================================
   INGREDIENTS
============================================================ */
export function renderIngredients(
  ingredients?: Ingredient[],
  isLoggedIn?: boolean,
  recipe?: Recipe
): HTMLElement {
  const ingList = createElement("ul", {
    class: "ingredients-list",
  }) as HTMLUListElement;

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return createElement("ul", { class: "ingredients-list" }, [
      createElement("li", {}, ["No ingredients available."]),
    ]);
  }
  const canEditRecipe = isRecipeOwner(recipe);

  function makeAddBtn(ingredient: Ingredient, recipeQuantity?: number | string): HTMLElement {
    let adding = false;

    const btn = Button({
      title: "Add to Cart",
      classes: "small-button",
      events: {
        click: async (event?: Event) => {
          event?.stopPropagation?.();
          if (adding) return;

          const token = getState("token");
          if (!token) {
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
            await addToCart({
              itemId,
              quantity,
              isLoggedIn: true,
              onCartUpdated: (response: unknown) => {
                console.debug("Recipe ingredient cart updated:", response);
              },
            });
          } catch (error) {
            console.error("Failed to add recipe ingredient to cart:", error);
          } finally {
            adding = false;
            btn.disabled = false;
          }
        },
      },
    }) as HTMLButtonElement;

    return btn;
  }

  ingredients.forEach((ingredient, index) => {
    const li = createElement("li", {});
    const quantity = ingredient.quantity ?? "";
    const unit = ingredient.unit ?? "";
    const name = ingredient.name ?? "";
    const textContainer = createElement("span", {}, [`${quantity} ${unit} ${name}`.trim()]);
    li.appendChild(textContainer);

    const itemId = getIngredientItemId(ingredient);
    if (!itemId) {
      li.appendChild(createElement("span", { class: "warning" }, ["Unavailable in store"]));
    }

    if (isLoggedIn && itemId) {
      li.appendChild(makeAddBtn(ingredient, quantity));
    }

    if (canEditRecipe) {
      const editBtn = Button({
        title: "Edit",
        classes: "tiny-button",
        events: {
          click: (event?: Event) => {
            event?.stopPropagation?.();
            makeInlineEditable(textContainer, name, (newValue: string) => {
              const cleanValue = String(newValue ?? "").trim();
              ingredient.name = cleanValue;
              textContainer.replaceChildren(
                `${ingredient.quantity ?? ""} ${ingredient.unit ?? ""} ${cleanValue}`.trim()
              );
            });
          },
        },
      });

      const delBtn = Button({
        title: "Delete",
        classes: "tiny-button",
        events: {
          click: (event?: Event) => {
            event?.stopPropagation?.();
            if (!confirm("Delete this ingredient?")) return;
            li.remove();
            ingredients.splice(index, 1);
          },
        },
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
export function renderSteps(
  recipeid: string | number,
  steps?: RecipeStep[],
  recipe?: Recipe
): HTMLElement {
  const safeSteps: RecipeStep[] = Array.isArray(steps) ? steps : [];
  let completedSteps = new Set<number>();

  try {
    const stored = JSON.parse(localStorage.getItem(getStepKey(recipeid)) || "[]");
    if (Array.isArray(stored)) {
      completedSteps = new Set(
        stored.filter((value): value is number => Number.isInteger(value) && value >= 0)
      );
    }
  } catch (error) {
    console.warn("Failed to restore recipe progress:", error);
  }

  const progressFill = createElement("div", { class: "progress-fill" });
  const progressText = createElement("span", { class: "progress-text" });

  function updateProgress(): void {
    const percentage = safeSteps.length ? Math.round((completedSteps.size / safeSteps.length) * 100) : 0;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% done`;
  }
  updateProgress();

  const stepsOl = createElement("ol", {});
  const canEditRecipe = isRecipeOwner(recipe);

  safeSteps.forEach((step, index) => {
    const text = typeof step === "object" ? step?.text ?? "" : String(step ?? "");
    const li = createElement("li", {});
    const checkbox = createElement("input", {
      type: "checkbox",
      "aria-label": `Complete step ${index + 1}`,
    }) as HTMLInputElement;

    checkbox.checked = completedSteps.has(index);
    checkbox.addEventListener("change", (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.checked) {
        completedSteps.add(index);
      } else {
        completedSteps.delete(index);
      }
      try {
        localStorage.setItem(getStepKey(recipeid), JSON.stringify([...completedSteps]));
      } catch (error) {
        console.warn("Failed to save recipe progress:", error);
      }
      updateProgress();
    });

    const textContainer = createElement("span", {}, [text]);
    li.append(checkbox, textContainer);

    if (canEditRecipe) {
      const editBtn = Button({
        title: "Edit",
        classes: "tiny-button",
        events: {
          click: (event?: Event) => {
            event?.stopPropagation?.();
            makeInlineEditable(textContainer, text, (newValue: string) => {
              const cleanValue = String(newValue ?? "").trim();
              if (typeof step === "object") {
                safeSteps[index] = { ...step, text: cleanValue };
              } else {
                safeSteps[index] = { text: cleanValue };
              }
              textContainer.replaceChildren(cleanValue);
            });
          },
        },
      });

      const delBtn = Button({
        title: "Delete",
        classes: "tiny-button",
        events: {
          click: (event?: Event) => {
            event?.stopPropagation?.();
            if (!confirm("Delete this step?")) return;
            li.remove();
            safeSteps.splice(index, 1);
            completedSteps = new Set(
              [...completedSteps]
                .filter((completedIndex) => completedIndex !== index)
                .map((completedIndex) => (completedIndex > index ? completedIndex - 1 : completedIndex))
            );
            try {
              localStorage.setItem(getStepKey(recipeid), JSON.stringify([...completedSteps]));
            } catch (error) {
              console.warn("Failed to save recipe progress:", error);
            }
            updateProgress();
          },
        },
      });

      li.append(editBtn, delBtn);
    }
    stepsOl.appendChild(li);
  });

  const progressBar = createElement(
    "div",
    {
      class: "progress-bar",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
    },
    [progressFill, progressText]
  );

  return createElement("div", { class: "steps-section" }, [progressBar, stepsOl]);
}

/* ============================================================
   COMMENTS
============================================================ */
export function renderComments(recipe: Recipe): HTMLElement {
  const wrapper = createElement("div", { class: "recipe-comments" });
  const heading = createElement("h4", {}, ["Comments"]);
  const toggle = createElement(
    "button",
    {
      type: "button",
      class: "toggle-comments btn btn-link",
      "aria-expanded": "false",
    },
    ["💬 Show Comments"]
  ) as HTMLButtonElement;

  let commentsEl: HTMLElement | null = null;
  let visible = false;
  let loaded = false;
  let loading = false;

  toggle.addEventListener("click", async () => {
    if (loaded) {
      visible = !visible;
      if (commentsEl) {
        commentsEl.style.display = visible ? "" : "none";
      }
      toggle.textContent = visible ? "💬 Hide Comments" : "💬 Show Comments";
      toggle.setAttribute("aria-expanded", String(visible));
      return;
    }
    if (loading) return;
    loading = true;
    toggle.disabled = true;
    try {
      const user = getState("user") as User | undefined;
      commentsEl = await createCommentsSection("recipe", recipe.recipeid, user?.userid);
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
export function renderActions(
  recipe: Recipe,
  currentUser: User | string | number | null,
  contentContainer: HTMLElement,
  isFavorite: boolean,
  recipeid: string | number
): HTMLElement {
  const favBtn = Button({
    title: isFavorite ? "Unsave" : "Save Recipe",
    classes: "buttonx secondary",
    events: {
      click: () => {
        let favorites: Array<string | number> = [];
        try {
          const stored = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
          if (Array.isArray(stored)) {
            favorites = stored;
          }
        } catch (error) {
          console.warn("Failed to read favorite recipes:", error);
        }
        const normalizedRecipeId = String(recipeid);
        const normalizedFavorites = favorites.map((id) => String(id));
        if (isFavorite) {
          favorites = normalizedFavorites.filter((id) => id !== normalizedRecipeId);
          isFavorite = false;
        } else {
          favorites = [...new Set([...normalizedFavorites, normalizedRecipeId])];
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
      },
    },
  });

  const shareBtn = Button({
    title: "Copy Link",
    classes: "buttonx secondary",
    events: {
      click: async () => {
        try {
          if (!navigator.clipboard) {
            throw new Error("Clipboard API unavailable.");
          }
          await navigator.clipboard.writeText(window.location.href);
          Notify("Recipe link copied.", { type: "success", duration: 2000 });
        } catch (error) {
          console.error("Failed to copy recipe link:", error);
          Notify("Unable to copy the recipe link.", { type: "warning", duration: 3000 });
        }
      },
    },
  });

  const printBtn = Button({
    title: "Print",
    classes: "buttonx secondary",
    events: {
      click: () => {
        window.print();
      },
    },
  });

  const actions: HTMLElement[] = [favBtn, shareBtn, printBtn];

  const resolvedCurrentUserId =
    typeof currentUser === "object" && currentUser !== null
      ? currentUser.id ?? currentUser.userid
      : currentUser;

  const resolvedRecipeUserId = recipe?.userid ?? recipe?.user_id;

  const isOwner =
    resolvedCurrentUserId !== null &&
    resolvedCurrentUserId !== undefined &&
    resolvedRecipeUserId !== null &&
    resolvedRecipeUserId !== undefined &&
    String(resolvedCurrentUserId) === String(resolvedRecipeUserId);

  if (isOwner) {
    const editBtn = Button({
      title: "Edit",
      classes: "buttonx secondary",
      events: {
        click: () => {
          editRecipe(contentContainer, recipe);
        },
      },
    });
    actions.push(editBtn);
  }

  const backBtn = Button({
    title: "Back",
    classes: "buttonx primary",
    events: {
      click: () => {
        history.back();
      },
    },
  });
  actions.push(backBtn);

  return createElement("div", { class: "recipe-actions" }, actions);
}