import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Bannerx from "../../components/base/Bannerx.js";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import { EntityType } from "../../utils/imagePaths.js";
import { Recipe, User } from "./types/recipe.js";

// --- LocalStorage Helpers ---
export function getStepKey(recipeid: string | number): string {
  return `completedSteps:${recipeid}`;
}

export function getFavorites(): Array<string | number> {
  try {
    return JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
  } catch {
    return [];
  }
}

export function saveFavorite(recipeid: string | number, value: boolean): void {
  let fav = getFavorites();
  fav = value ? [...new Set([...fav, recipeid])] : fav.filter((id) => id !== recipeid);
  localStorage.setItem("favoriteRecipes", JSON.stringify(fav));
}

// --- Inline Edit Helper ---
export function makeInlineEditable(
  container: HTMLElement,
  currentText: string,
  onSave: (newValue: string) => void
): void {
  const input = createElement("input", { type: "text", value: currentText }) as HTMLInputElement;

  const saveBtn = Button({
    title: "Save",
    classes: "tiny-button",
    events: {
      click: () => {
        const newVal = input.value.trim();
        if (newVal) {
          onSave(newVal);
        }
      },
    },
  });

  const cancelBtn = Button({
    title: "Cancel",
    classes: "tiny-button",
    events: {
      click: () => {
        container.replaceChildren(createElement("span", {}, [currentText]));
      },
    },
  });

  container.replaceChildren(input, saveBtn, cancelBtn);
}

// --- Author ---
export function renderAuthor(recipe: Recipe, currentUser?: string | number | null): HTMLElement {
  const container = createElement("p", { class: "author-info" }, ["Loading author..."]) as HTMLElement;

  if (recipe.userid !== undefined) {
    fetchUserMeta([String(recipe.userid)]).then((userx: Record<string | number, User>) => {
      recipe.username = userx[recipe.userid!]?.username || "Anonymous";

      container.replaceChildren(
        ...(currentUser === recipe.userid
          ? ["By You"]
          : ["By ", createElement("a", { href: `/user/${recipe.username}` }, [recipe.username])])
      );
    });
  }

  return container;
}

// --- Banner ---
export function createRecipeBannerSection(recipe: Recipe, currentUser?: string | number | null): HTMLElement {
  const isCreator = recipe.userid === currentUser;
  return Bannerx({
    isCreator,
    bannerkey: recipe.banner,
    banneraltkey: `Banner for ${recipe.name || recipe.title || "Recipe"}`,
    bannerentitytype: EntityType.RECIPE,
    stateentitykey: "recipe",
    bannerentityid: recipe.recipeid,
  });
}

// --- Info Box ---
export function renderInfoBox(recipe: Recipe): HTMLElement {
  const infoRow = (label: string, value?: string | number | null) =>
    createElement("div", { class: "info-row" }, [
      createElement("strong", { class: "info-label" }, [`${label}: `]),
      createElement("span", { class: "info-value" }, [String(value || "N/A")]),
    ]);

  const children: HTMLElement[] = [];

  if (recipe.description) {
    children.push(createElement("p", { class: "recipe-description" }, [recipe.description]));
  }

  children.push(infoRow("Cook Time", recipe.cookTime));
  if (recipe.cuisine) {
    children.push(infoRow("Cuisine", recipe.cuisine));
  }
  if (recipe.portionSize) {
    children.push(infoRow("Portion Size", recipe.portionSize));
  }
  if (recipe.season) {
    children.push(infoRow("Season / Occasion", recipe.season));
  }
  if (Array.isArray(recipe.dietary) && recipe.dietary.length) {
    children.push(infoRow("Dietary", recipe.dietary.join(", ")));
  }

  if (recipe.videoUrl) {
    children.push(
      createElement("div", { class: "info-row" }, [
        createElement("span", { class: "info-label" }, ["Video: "]),
        createElement("a", { href: recipe.videoUrl, target: "_blank", class: "info-link" }, ["Watch Tutorial"]),
      ])
    );
  }

  if (recipe.notes) {
    children.push(infoRow("Notes", recipe.notes));
  }

  return createElement("div", { class: "recipe-info-box" }, children);
}

// --- Tags ---
export function renderTags(tags?: string[]): HTMLElement {
  return createElement("div", { class: "tags-section" }, [
    createElement("h3", {}, ["Tags"]),
    createElement(
      "div",
      { class: "tags" },
      (tags || []).map((tag) => createElement("span", { class: "tag" }, [tag]))
    ),
  ]);
}