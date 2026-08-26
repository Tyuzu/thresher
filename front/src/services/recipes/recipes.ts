import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/navigate.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createRecipe } from "./createOrEditRecipe.js";
import { fetchRecipes } from "./api.js";
import { adspace } from "../../services/ads/newads.js";
import { t } from "../../i18n/i18n.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { Recipe } from "./types/recipe.js";

export async function displayRecipes(container: HTMLElement, isLoggedIn: boolean): Promise<void> {
  container.replaceChildren();

  const PAGE_NAME = "recipes";

  // ---------- SIDEBAR SECTIONS ----------
  const actionButton = Button({
    title: t("recipes.createNewRecipe", {}, "Create Recipe"),
    id: "create-recipe-shortcut",
    classes: "buttonx secondary",
    events: { click: () => createRecipe(container) },
  });

  const actionsWrapper = createElement("div", { class: "aside-actions-group" }, [actionButton]);

  // Sidebar Ad component
  const sidebarAd = adspace("aside", PAGE_NAME, {
    layout: "vertical",
    width: 300,
    height: 250,
    refreshInterval: 30000,
  });

  const asideContent = createAsideContent({
    title: t("recipes.filters", {}, "Filters"),
    sections: [
      {
        title: t("recipes.actions", {}, "Actions"),
        content: actionsWrapper,
        className: "aside-actions-section",
      },
      {
        content: sidebarAd,
        className: "aside-ad-section",
      },
    ],
    showAd: false, // Handled directly via custom section to prevent duplication
    page: PAGE_NAME,
  });

  // ---------- MAIN HEADER & ACTIONS ----------
  const mainActions = createElement("div", { class: "recipe-actions" });
  if (isLoggedIn) {
    mainActions.append(
      Button({
        title: t("recipes.createNewRecipe", {}, "Create New Recipe"),
        id: "create-recipe-btn",
        classes: "buttonx primary",
        events: { click: () => createRecipe(container) },
      })
    );
  }

  const mainHeader = [
    createElement("h1", {}, [t("recipes.recipes", {}, "Recipes")]),
    mainActions,
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 45000,
    }),
  ];

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "recipes-page",
  });

  container.append(layout);

  const mainElement = layout.querySelector(".layout-main") as HTMLElement;
  const list = createElement("div", { class: "recipe-list" });

  // ---------- FETCH RECIPES ----------
  let recipes: Recipe[] = [];
  try {
    recipes = await fetchRecipes();
  } catch (err) {
    console.error("Failed to load recipes", err);
  }

  // ---------- RENDER LIST ----------
  if (!recipes.length) {
    list.append(createElement("p", {}, ["No recipes found."]));
  } else {
    recipes.forEach((recipe, idx) => {
      list.append(createRecipeCard(recipe, isLoggedIn));

      // Inject an in-list native ad every 5 recipe cards
      if ((idx + 1) % 5 === 0) {
        list.append(
          adspace("inlist", PAGE_NAME, {
            layout: "horizontal",
            width: "100%",
            height: 120,
          })
        );
      }
    });
  }

  mainElement.append(list);
}

// ---------- CARD BUILDER ----------
function createRecipeCard(recipe: Recipe, _isLoggedIn: boolean): HTMLElement {
  const imageUrl = resolveImagePath(
    EntityType.RECIPE,
    PictureType.THUMB,
    recipe.banner
  );

  return createElement("div", { class: "recipe-card" }, [
    Imagex({ src: imageUrl, alt: recipe.title || recipe.name || "", classes: "thumbnail" }),
    createElement("h3", {}, [recipe.title || recipe.name || "Untitled"]),
    createElement("p", {}, [recipe.description || ""]),
    createElement("p", {}, [
      t(
        "recipes.prepTime",
        { cookTime: recipe.cookTime || "N/A" },
        `Prep Time: ${recipe.cookTime || "N/A"}`
      ),
    ]),
    createElement(
      "div",
      { class: "tags" },
      (recipe.tags || []).map((tag) => createElement("span", { class: "tag" }, [tag]))
    ),
    Button({
      title: t("recipes.viewRecipe", {}, "View Recipe"),
      id: `view-${recipe.recipeid}`,
      classes: "buttonx primary",
      events: { click: () => navigate(`/recipe/${recipe.recipeid}`) },
    }),
  ]);
}