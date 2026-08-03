import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { apiFetch } from "../../api/api.js";
import { createRecipe } from "./createOrEditRecipe.js";
import { adspace } from "../home/homeHelpers.js";
import { t } from "../../i18n/i18n.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

export async function displayRecipes(container, isLoggedIn) {
  container.replaceChildren();

  // ---------- ACTIONS & SIDEBAR ----------
  const actions = [
    Button(
      t("recipes.createNewRecipe", {}, "Create Recipe"),
      "create-recipe-shortcut",
      { click: () => createRecipe(container) },
      "buttonx secondary"
    ),
  ];

  const asideContent = createAsideContent({
    title: t("recipes.filters", {}, "Filters"),
    actions,
  });

  // ---------- MAIN HEADER & ACTIONS ----------
  const mainActions = createElement("div", { class: "recipe-actions" });
  if (isLoggedIn) {
    mainActions.append(
      Button(
        t("recipes.createNewRecipe", {}, "Create New Recipe"),
        "create-recipe-btn",
        { click: () => createRecipe(container) },
        "buttonx primary"
      )
    );
  }

  const mainHeader = [
    createElement("h1", {}, [t("recipes.recipes", {}, "Recipes")]),
    mainActions,
    adspace("inbody"),
  ];

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "recipes-page",
  });

  container.append(layout);

  const mainElement = layout.querySelector(".layout-main");
  const list = createElement("div", { class: "recipe-list" });

  // ---------- FETCH RECIPES ----------
  let recipes = [];
  try {
    const resp = await apiFetch("/recipes?offset=0&limit=5000");
    recipes = Array.isArray(resp) ? resp : resp?.recipes || [];
  } catch (err) {
    console.error("Failed to load recipes", err);
  }

  // ---------- RENDER LIST ----------
  if (!recipes.length) {
    list.append(createElement("p", {}, ["No recipes found."]));
  } else {
    recipes.forEach((recipe, idx) => {
      list.append(createRecipeCard(recipe, isLoggedIn));
      if ((idx + 1) % 6 === 0) {
        list.append(adspace("inlist"));
      }
    });
  }

  mainElement.append(list);
}

// ---------- CARD BUILDER ----------
function createRecipeCard(recipe, _isLoggedIn) {
  const imageUrl = resolveImagePath(
    EntityType.RECIPE,
    PictureType.THUMB,
    recipe.banner
  );

  return createElement("div", { class: "recipe-card" }, [
    Imagex({ src: imageUrl, alt: recipe.title, classes: "thumbnail" }),
    createElement("h3", {}, [recipe.title]),
    createElement("p", {}, [recipe.description]),
    createElement(
      "p",
      {},
      [
        t(
          "recipes.prepTime",
          { cookTime: recipe.cookTime || "N/A" },
          `Prep Time: ${recipe.cookTime || "N/A"}`
        ),
      ]
    ),
    createElement(
      "div",
      { class: "tags" },
      (recipe.tags || []).map((tag) =>
        createElement("span", { class: "tag" }, [tag])
      )
    ),
    Button(
      t("recipes.viewRecipe", {}, "View Recipe"),
      `view-${recipe.recipeid}`,
      { click: () => navigate(`/recipe/${recipe.recipeid}`) },
      "buttonx primary"
    ),
  ]);
}