import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { persistTabs } from "../../utils/persistTabs.js";
import { displayMedia } from "../media/ui/mediaGallery.js";

import {
  getFavorites,
  renderAuthor,
  createRecipeBannerSection,
  renderInfoBox,
  renderTags
} from "./recipeRenderers.js";

import {
  renderIngredients,
  renderSteps,
  renderComments,
  renderActions
} from "./recipeSections.js";


/* =========================
   MAIN DISPLAY
========================= */

export async function displayRecipe(content, isLoggedIn, recipeid) {
  content.replaceChildren();

  const container = createElement("div", { class: "recipepage" });
  content.appendChild(container);

  const currentUser = getState("user");

  let recipe;

  try {
    recipe = await apiFetch(`/recipes/recipe/${recipeid}`);
  } catch {
    container.replaceChildren(
      createElement("p", {}, ["Recipe not found or failed to load."])
    );
    return;
  }

  const isFavorite = getFavorites().includes(recipeid);
  // const isCreator = currentUser && recipe.userId === currentUser;

  /* HEADER */
  const titleEl = createElement("h2", {}, [
    recipe.title || "Untitled"
  ]);

  const metaInfo = [];

  if (recipe.version) {
    metaInfo.push(
      createElement("p", { class: "version-info" }, [
        `Version ${recipe.version}`
      ])
    );
  }

  if (recipe.lastUpdated) {
    metaInfo.push(
      createElement("p", { class: "version-info" }, [
        `Last updated: ${new Date(recipe.lastUpdated).toLocaleDateString()}`
      ])
    );
  }

  const authorEl = renderAuthor(recipe, currentUser);

  /* BANNER + INFO */
  const bannerEl = createRecipeBannerSection(recipe, currentUser);
  const infoBox = renderInfoBox(recipe);
  const tagsEl = renderTags(recipe.tags);


  /* SETUP TABS */
  const tabs = [
    {
      title: "Ingredients",
      id: "ingredients-tab",
      render: (c) => {
        c.replaceChildren(renderIngredients(recipe.ingredients, isLoggedIn, recipe));
      }
    },
    {
      title: "Steps",
      id: "steps-tab",
      render: (c) => {
        c.replaceChildren(renderSteps(recipeid, recipe.steps || [], recipe));
      }
    },
    {
      title: "Comments",
      id: "comments-tab",
      render: (c) => {
        c.replaceChildren(renderComments(recipe));
      }
    },
    {
      title: "Media",
      id: "media-tab",
      render: (c) => displayMedia(c, "recipe", recipeid, isLoggedIn)
    },
    {
      title: "Actions",
      id: "actions-tab",
      render: (c) => {
        c.replaceChildren(renderActions(recipe, currentUser, content, isFavorite, recipeid));
      }
    }
  ];

  /* FINAL ASSEMBLY */
  container.replaceChildren(
    titleEl,
    ...metaInfo,
    authorEl,
    bannerEl,
    infoBox,
    tagsEl
  );

  // Use persistent tabs component which handles storage and appending
  persistTabs(container, tabs, `recipe-tabs:${recipeid}`);
}